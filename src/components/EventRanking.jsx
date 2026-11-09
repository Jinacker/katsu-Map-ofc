import React, { useEffect, useState } from 'react';
import apiClient from '../api/axios';

export default function EventRanking({ eventId, saved }) {
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!saved) return undefined;
    let cancelled = false;
    setStatus('loading');
    setData(null);
    apiClient.get(`/api/v1/admin/events/${eventId}/ranking`, { params: { page } })
      .then((response) => {
        if (!cancelled) { setData(response.data.data); setStatus('ready'); }
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [eventId, page, reload, saved]);

  return <section className="events-card events-ranking">
    <div className="events-ranking-heading">
      <div><h2>이벤트 유저 랭킹</h2><p className="events-help">이 이벤트에서 적립한 스탬프 수 기준이에요. 같은 개수는 공동 순위로 표시됩니다.</p></div>
      {saved && <button type="button" className="events-button" disabled={status === 'loading'} onClick={() => setReload((value) => value + 1)}>새로고침</button>}
    </div>
    {!saved ? <p className="events-ranking-state">이벤트를 저장하면 랭킹을 확인할 수 있어요.</p>
      : status === 'loading' ? <p className="events-ranking-state" role="status">랭킹을 불러오고 있어요.</p>
        : status === 'error' ? <div className="events-ranking-state" role="alert">랭킹을 불러오지 못했습니다. <button type="button" className="events-button" onClick={() => setReload((value) => value + 1)}>다시 시도</button></div>
          : !data?.items?.length ? <p className="events-ranking-state">아직 스탬프를 적립한 유저가 없어요.</p>
            : <div className="events-ranking-table-wrap"><table className="events-ranking-table">
              <thead><tr><th>순위</th><th>유저</th><th>스탬프</th></tr></thead>
              <tbody>{data.items.map((item) => <tr key={item.userId}>
                <td>{item.rank}위</td><td><strong>{item.nickname}</strong> <span className="events-ranking-user-id">#{item.userId}{!item.isProfilePublic ? ' · 비공개' : ''}</span></td><td>{item.stampCount}개</td>
              </tr>)}</tbody>
            </table></div>}
    {saved && status === 'ready' && (page > 1 || data?.hasMore) && <div className="events-ranking-pages">
      <button type="button" className="events-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>이전</button>
      <span>{page} 페이지</span>
      <button type="button" className="events-button" disabled={!data?.hasMore} onClick={() => setPage((value) => value + 1)}>다음</button>
    </div>}
  </section>;
}
