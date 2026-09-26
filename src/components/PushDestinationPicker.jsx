import React, { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import { describePushDestinationItem, getPushDestinationSearch } from '../utils/pushDestinationSearch';
import { PUSH_ID_LABELS } from '../utils/pushNavigation';

export default function PushDestinationPicker({ idKey, value, onChange }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('idle');
  const [encyclopediaPosts, setEncyclopediaPosts] = useState([]);
  const [encyclopediaStatus, setEncyclopediaStatus] = useState('idle');
  const searchable = idKey === 'userId' || idKey === 'restaurantId';
  const isEncyclopediaPost = idKey === 'postId';

  useEffect(() => {
    if (selected) return;
    const search = getPushDestinationSearch(idKey, query);
    if (!search) {
      setItems([]);
      setStatus('idle');
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setItems([]);
    setStatus('loading');
    const timer = setTimeout(() => {
      apiClient.get(search.url, { params: search.params, signal: controller.signal }).then((response) => {
        if (cancelled) return;
        setItems(Array.isArray(response.data?.data) ? response.data.data : []);
        setStatus('done');
      }).catch(() => { if (!cancelled) setStatus('error'); });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [idKey, query, selected]);

  useEffect(() => {
    if (!isEncyclopediaPost) return undefined;
    let cancelled = false;
    setEncyclopediaStatus('loading');
    apiClient.get('/api/v1/admin/encyclopedia-posts').then((response) => {
      if (cancelled) return;
      const posts = Array.isArray(response.data?.data) ? response.data.data : [];
      setEncyclopediaPosts(posts.filter((post) => post.status === 'published'));
      setEncyclopediaStatus('done');
    }).catch(() => {
      if (!cancelled) setEncyclopediaStatus('error');
    });
    return () => { cancelled = true; };
  }, [isEncyclopediaPost]);

  return (
    <div style={{ marginTop: 8 }}>
      {searchable && <>
        <input style={inputStyle} aria-label={idKey === 'userId' ? '사용자 검색' : '식당 검색'}
          placeholder={idKey === 'userId' ? '닉네임 또는 사용자 ID 검색' : '식당 이름·주소 또는 ID 검색'}
          value={query} onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
            onChange('');
          }} />
        {status === 'loading' && !selected && <p style={hintStyle}>검색 중...</p>}
        {status === 'error' && !selected && <p style={hintStyle}>검색에 실패했어요. 다시 검색하거나 ID를 직접 입력해주세요.</p>}
        {status === 'done' && !selected && items.length === 0 && <p style={hintStyle}>검색 결과가 없어요.</p>}
        {!selected && items.map((item) => <button type="button" key={item.id} style={resultStyle} onClick={() => {
          setSelected(item);
          setQuery(describePushDestinationItem(idKey, item));
          setItems([]);
          onChange(String(item.id));
        }}>{describePushDestinationItem(idKey, item)}</button>)}
        {selected && String(selected.id) === String(value) && <p style={hintStyle}>선택: {describePushDestinationItem(idKey, selected)}</p>}
      </>}
      {isEncyclopediaPost && <>
        {encyclopediaStatus === 'loading' && <p style={hintStyle}>백과 글 목록을 불러오는 중...</p>}
        {encyclopediaStatus === 'error' && <p style={hintStyle}>백과 글 목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>}
        {encyclopediaStatus === 'done' && (
          encyclopediaPosts.length > 0 ? (
            <select
              style={inputStyle}
              aria-label="백과 글 선택"
              value={value}
              onChange={(event) => onChange(event.target.value)}
            >
              <option value="">백과 글을 선택하세요</option>
              {encyclopediaPosts.map((post) => (
                <option key={post.id} value={post.id}>
                  {`${post.emoji ? `${post.emoji} ` : ''}${post.title} · ${post.category} · #${post.id}`}
                </option>
              ))}
            </select>
          ) : <p style={hintStyle}>발행된 백과 글이 없습니다.</p>
        )}
      </>}
      {!isEncyclopediaPost && <input style={{ ...inputStyle, marginTop: searchable ? 8 : 0 }} inputMode="numeric"
        aria-label={`${PUSH_ID_LABELS[idKey] || '상세 ID'} 직접 입력`} placeholder={`${PUSH_ID_LABELS[idKey] || '상세 ID'} 직접 입력`}
        value={value} onChange={(event) => {
          setSelected(null);
          setQuery('');
          onChange(event.target.value);
        }} />}
    </div>
  );
}

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 };
const hintStyle = { margin: '6px 0', fontSize: 13, color: '#777' };
const resultStyle = { display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: '1px solid #eee', background: '#fff', cursor: 'pointer' };
