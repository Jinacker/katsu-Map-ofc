import React from 'react';

const MAX_ITEMS = 30;
// 이벤트 웹이 읽는 수량 표는 publicData.luckyDraw 한 곳에만 둔다.
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
const moveItem = (items, index, direction) => {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export default function EventLuckyDrawEditor({ event, onChange, locked }) {
  const luckyDraw = event.publicData?.luckyDraw;
  const items = Array.isArray(luckyDraw?.items) ? luckyDraw.items : [];
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
    {!items.length && <div className="events-store-empty">수량을 등록하지 않으면 이벤트 웹에 적어둔 기본 선물 목록이 그대로 나옵니다.</div>}
    <div className="event-reward-actions">
      <button type="button" className="events-button" disabled={locked || items.length >= MAX_ITEMS} onClick={() => patch([...items, { name: '', stock: '' }])}>+ 선물 추가</button>
      {items.length > 0 && <button type="button" className="events-text-button" disabled={locked} onClick={() => patch([])}>목록 비우기 (기본 목록으로 되돌리기)</button>}
    </div>
    {luckyDraw?.updatedAt && <p className="events-help">마지막 수정: {luckyDraw.updatedAt} · 이벤트 웹 선물 목록 아래에 기준 날짜로 표시됩니다.</p>}
    <p className="events-help">수량은 ‘10개’처럼 단위까지 적어주세요. ‘0개’로 적거나 품절을 체크하면 이벤트 웹에서 품절로 흐리게 표시됩니다. 이름이 비어 있는 줄은 웹에 나오지 않아요.</p>
  </section>;
}
