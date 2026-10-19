import React from 'react';

const MAX_ITEMS = 30;
// 이벤트 웹이 읽는 수량 표는 publicData.luckyDraw 한 곳에만 둔다.
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
// 아직 저장한 수량이 없을 때 채워 보여줄 목록. 이벤트 웹의 기본 선물 목록과 같은 내용이다.
const DEFAULT_ITEMS = [
  { name: '한국식돈가스지도', stock: '1장' },
  { name: '돈가스지도 NFC 키링', stock: '2개' },
  { name: '오리 NFC 키링', stock: '2개' },
  { name: '돈가스 수세미', stock: '3개' },
  { name: '성북천도굴꾼 모자', stock: '1개' },
  { name: '성북천오리미니어쳐', stock: '2개' },
  { name: '성북천 자랑 ZINE(만화책)', stock: '1권' },
  { name: '스티커팩', stock: '10개' },
  { name: '뱃지', stock: '10개' },
];
const moveItem = (items, index, direction) => {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export default function EventLuckyDrawEditor({ event, onChange, locked }) {
  const luckyDraw = event.publicData?.luckyDraw;
  const saved = Array.isArray(luckyDraw?.items) ? luckyDraw.items : [];
  // 저장한 수량이 없으면 기본 목록을 그대로 띄워 바로 숫자만 고칠 수 있게 한다. 고치는 순간 전체가 저장된다.
  const items = saved.length ? saved : DEFAULT_ITEMS;
  // 수량을 고칠 때마다 기준 날짜를 오늘로 갱신해 이벤트 웹에 '○월 ○일 기준'으로 보여준다.
  const patch = (next) => onChange({ luckyDraw: { items: next, updatedAt: today() } });
  const update = (index, value) => patch(items.map((item, order) => order === index ? { ...item, ...value } : item));

  return <section className="events-card event-lucky-draw-editor">
    <div className="events-card-heading"><span className="events-step">06</span><div><h2>럭키드로우 남은 수량</h2>
      <p>이벤트 웹 ‘선물 안내’ 창에 보이는 목록입니다. 저장하면 앱 업데이트 없이 1분 안에 반영돼요.</p></div></div>
    <div className="events-subsection-heading"><h3>선물 목록</h3><span className="events-count">{items.length}/{MAX_ITEMS}개</span></div>
    {items.map((item, index) => <div className="event-reward-row" key={index}>
      <div className="event-goods-order">
        <button type="button" className="events-text-button" aria-label="위로 이동" disabled={locked || index === 0} onClick={() => patch(moveItem(items, index, -1))}>▲</button>
        <button type="button" className="events-text-button" aria-label="아래로 이동" disabled={locked || index === items.length - 1} onClick={() => patch(moveItem(items, index, 1))}>▼</button>
      </div>
      <input aria-label={`${index + 1}번째 선물 이름`} maxLength={40} placeholder="선물 이름 (예: 스티커팩)" value={item.name ?? ''}
        onChange={(e) => update(index, { name: e.target.value.replace(/[\r\n\t]/g, '') })} />
      <input aria-label={`${item.name || `${index + 1}번째 선물`} 남은 수량`} className="event-reward-stock" maxLength={20} placeholder="남은 수량 (예: 10개)" value={item.stock ?? ''}
        onChange={(e) => update(index, { stock: e.target.value.replace(/[\r\n\t]/g, '') })} />
      <label className="event-reward-soldout"><input type="checkbox" checked={item.soldOut === true} onChange={(e) => update(index, { soldOut: e.target.checked })} />품절</label>
      <button type="button" className="events-text-button event-goods-delete" disabled={locked} onClick={() => patch(items.filter((unused, order) => order !== index))}>삭제</button>
    </div>)}
    <div className="event-reward-actions">
      <button type="button" className="events-button" disabled={locked || items.length >= MAX_ITEMS} onClick={() => patch([...items, { name: '', stock: '' }])}>+ 선물 추가</button>
      {saved.length > 0 && <button type="button" className="events-text-button" disabled={locked} onClick={() => patch([])}>기본 목록으로 되돌리기</button>}
    </div>
    <p className="events-help">{saved.length
      ? `마지막 수정: ${luckyDraw?.updatedAt || '기록 없음'} · 이벤트 웹 선물 목록 아래에 기준 날짜로 표시됩니다.`
      : '아직 저장한 수량이 없어 이벤트 웹의 기본 선물 목록을 띄워 뒀어요. 숫자를 고치고 설정 저장을 누르면 이 목록이 저장됩니다.'}</p>
    <p className="events-help">수량은 ‘10개’처럼 단위까지 적어주세요. ‘0개’로 적거나 품절을 체크하면 이벤트 웹에서 품절로 흐리게 표시됩니다. 이름이 비어 있는 줄은 웹에 나오지 않아요.</p>
  </section>;
}
