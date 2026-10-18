import React, { useState } from 'react';
import { uploadImageToGCS } from '../api/gcs';

const MAX_GOODS = 40;
const emptyGoods = () => ({ id: crypto.randomUUID(), name: '', price: '', imageUrl: '', fit: 'cover', linkUrl: '' });
const moveItem = (items, index, direction) => {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export default function EventGiftshopEditor({ event, onChange, locked, setBusy, onMessage }) {
  const giftshop = event.giftshop ?? { note: '', items: [] };
  const items = Array.isArray(giftshop.items) ? giftshop.items : [];
  const patch = (value) => onChange({ giftshop: { note: giftshop.note ?? '', items, ...value } });
  const update = (id, value) => patch({ items: items.map((item) => item.id === id ? { ...item, ...value } : item) });
  const [uploadingId, setUploadingId] = useState(null);

  const upload = async (e, id) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file || locked) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { onMessage('굿즈 사진은 JPG, PNG, WebP만 업로드할 수 있습니다.'); return; }
    setUploadingId(id); setBusy(true);
    try {
      // 투명 배경 굿즈(키링 등)는 JPEG 변환 시 검게 변하므로 알파 채널을 보존한다.
      const url = await uploadImageToGCS(file, 'event-goods', { preserveTransparency: file.type !== 'image/jpeg' });
      update(id, { imageUrl: url });
      onMessage('굿즈 사진을 업로드했습니다. 설정 저장을 눌러 반영해주세요.');
    } catch (error) { onMessage(error.message || '굿즈 사진 업로드에 실패했습니다.'); }
    finally { setUploadingId(null); setBusy(false); }
  };

  return <section className="events-card event-giftshop-editor">
    <div className="events-card-heading"><span className="events-step">05</span><div><h2>기프트숍</h2><p>이벤트 웹에 노출할 굿즈를 등록하세요. 입력한 순서대로 표시됩니다.</p></div></div>
    <label className="events-field">기프트숍 안내 문구<span className="events-help">굿즈 목록 위에 표시돼요. 두 줄, 200자까지. 비워두면 문구 없이 사진만 나옵니다.</span>
      <textarea className="events-map-message" rows={2} maxLength={200} placeholder="현장 방문 시 최대 2,000원 할인"
        value={giftshop.note ?? ''} onChange={(e) => patch({ note: e.target.value.replace(/[\r\t]/g, '').split('\n').slice(0, 2).join('\n') })} />
    </label>
    <div className="events-subsection-heading"><h3>굿즈 목록</h3><span className="events-count">{items.length}/{MAX_GOODS}개</span></div>
    {items.map((item, index) => <div className="event-goods-row" key={item.id}>
      <div className="event-goods-order">
        <button type="button" className="events-text-button" aria-label="위로 이동" disabled={index === 0} onClick={() => patch({ items: moveItem(items, index, -1) })}>▲</button>
        <button type="button" className="events-text-button" aria-label="아래로 이동" disabled={index === items.length - 1} onClick={() => patch({ items: moveItem(items, index, 1) })}>▼</button>
      </div>
      <div className="event-goods-photo events-checker">
        {item.imageUrl ? <img src={item.imageUrl} alt={`${item.name || '굿즈'} 사진`} style={{ objectFit: item.fit === 'contain' ? 'contain' : 'cover' }} /> : <span>{uploadingId === item.id ? '업로드 중' : '사진 없음'}</span>}
      </div>
      <div className="event-goods-fields">
        <input aria-label="굿즈 이름" maxLength={80} placeholder="굿즈 이름 (예: 돈가스 NFC 키링)" value={item.name} onChange={(e) => update(item.id, { name: e.target.value })} />
        <input aria-label="굿즈 가격" maxLength={30} placeholder="가격 (예: 11,000원)" value={item.price ?? ''} onChange={(e) => update(item.id, { price: e.target.value.replace(/[\r\n\t]/g, '') })} />
        <input type="url" aria-label="굿즈 스토어 링크" maxLength={2048} placeholder="스토어 링크 (선택, https://smartstore.naver.com/…)" value={item.linkUrl ?? ''} onChange={(e) => update(item.id, { linkUrl: e.target.value })} />
        <div className="event-goods-actions">
          <label>사진 표시<select aria-label="굿즈 사진 표시 방식" value={item.fit ?? 'cover'} onChange={(e) => update(item.id, { fit: e.target.value })}>
            <option value="cover">꽉 채우기</option><option value="contain">여백 유지</option>
          </select></label>
          <label className="event-goods-upload">{item.imageUrl ? '사진 변경' : '사진 업로드'}
            <input type="file" aria-label={`${item.name || '굿즈'} 사진 업로드`} accept="image/jpeg,image/png,image/webp" disabled={uploadingId === item.id} onChange={(e) => upload(e, item.id)} />
          </label>
          {item.imageUrl && <button type="button" className="events-text-button" onClick={() => update(item.id, { imageUrl: '' })}>사진 제거</button>}
          <button type="button" className="events-text-button event-goods-delete" onClick={() => patch({ items: items.filter((row) => row.id !== item.id) })}>삭제</button>
        </div>
      </div>
    </div>)}
    {!items.length && <div className="events-store-empty">아직 등록된 굿즈가 없어요. ‘굿즈 추가’로 시작해보세요.</div>}
    <button type="button" className="events-button" disabled={items.length >= MAX_GOODS} onClick={() => patch({ items: [...items, emptyGoods()] })}>+ 굿즈 추가</button>
    <p className="events-help">JPG는 원본 비율로 압축하고, 투명 배경 PNG·WebP는 투명도를 유지해 512px로 저장해요. 이름이 비어 있으면 저장할 수 없습니다.</p>
    <p className="events-help">스토어 링크는 https 주소만 입력하세요. 등록하면 굿즈 사진·상품명을 눌러 스토어로 이동합니다. 비워두면 구매 버튼 없이 사진 크게 보기를 제공합니다.</p>
  </section>;
}
