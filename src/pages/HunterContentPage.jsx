import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { uploadImageToGCS } from '../api/gcs';

const MAX_INSTA = 8;
const MAX_BLOG = 5;
const MAX_STORE = 8;
const MAX_NOTICE_IMAGES = 3;
const MAX_PICKS = 3;

const emptyInstaPost = () => ({ id: Date.now() + Math.random(), image: '', title: '', subtitle: '', url: '' });
const emptyBlogPost = () => ({ id: Date.now() + Math.random(), image: '', title: '', subtitle: '', url: '' });
const emptyStoreItem = () => ({ id: Date.now() + Math.random(), image: '', title: '', price: '' });

// 이미지 업로드 버튼 컴포넌트
function ImageUploadCell({ value, onChange, uploading, onUpload }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {value ? (
        <div style={{ position: 'relative', width: 80, height: 80 }}>
          <img src={value} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }} />
          <button
            onClick={() => onChange('')}
            style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, lineHeight: '18px', padding: 0 }}
          >×</button>
        </div>
      ) : (
        <label style={{ width: 80, height: 80, border: '2px dashed #d1d5db', borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'not-allowed' : 'pointer', background: '#f9fafb', fontSize: 11, color: '#9ca3af' }}>
          <span style={{ fontSize: 20 }}>+</span>
          <span>{uploading ? '업로드중' : '이미지'}</span>
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onUpload} disabled={uploading} />
        </label>
      )}
    </div>
  );
}

export default function HunterContentPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // 폼 상태
  const [noticeText, setNoticeText] = useState('');
  const [noticeImages, setNoticeImages] = useState([]);
  const [noticeBody, setNoticeBody] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [blogUrl, setBlogUrl] = useState('');
  const [picksTheme, setPicksTheme] = useState('');
  const [picksDesc, setPicksDesc] = useState('');
  const [picksRestaurantIds, setPicksRestaurantIds] = useState([]);
  const [picksRestaurants, setPicksRestaurants] = useState([]); // [{id, name, imageUrl}]
  const [instaPosts, setInstaPosts] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [storeItems, setStoreItems] = useState([]);

  // 업로드 중 상태
  const [uploadingNoticeIdx, setUploadingNoticeIdx] = useState(null);
  const [uploadingInstaIdx, setUploadingInstaIdx] = useState(null);
  const [uploadingBlogIdx, setUploadingBlogIdx] = useState(null);
  const [uploadingStoreIdx, setUploadingStoreIdx] = useState(null);

  // 가게 검색 모달
  const [showPickModal, setShowPickModal] = useState(false);
  const [pickSearch, setPickSearch] = useState('');
  const [pickSearchResults, setPickSearchResults] = useState([]);
  const [pickSearchLoading, setPickSearchLoading] = useState(false);
  const pickSearchTimer = useRef(null);

  // 셔플 로딩
  const [shuffling, setShuffling] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const res = await api.get('/api/v1/admin/hunter-content');
      const d = res.data?.data ?? res.data;
      setNoticeText(d.noticeText ?? '');
      setNoticeImages(d.noticeImages ?? []);
      setNoticeBody(d.noticeBody ?? '');
      setInstagramUrl(d.instagramUrl ?? '');
      setBlogUrl(d.blogUrl ?? '');
      setPicksTheme(d.picksTheme ?? '');
      setPicksDesc(d.picksDesc ?? '');
      setPicksRestaurantIds(d.picksRestaurantIds ?? []);
      setPicksRestaurants(d.picksRestaurants ?? []);
      setInstaPosts(d.instaPosts ?? []);
      setBlogPosts(d.blogPosts ?? []);
      setStoreItems(d.storeItems ?? []);
    } catch (e) {
      setMsg('불러오기 실패: ' + (e.response?.data?.message ?? e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      await api.put('/api/v1/admin/hunter-content', {
        noticeText, noticeImages, noticeBody,
        instagramUrl, blogUrl,
        picksTheme, picksDesc, picksRestaurantIds,
        instaPosts, blogPosts, storeItems,
      });
      setMsg('✅ 저장 완료!');
    } catch (e) {
      setMsg('❌ 저장 실패: ' + (e.response?.data?.message ?? e.message));
    } finally {
      setSaving(false);
    }
  };

  // 공지 이미지 업로드
  const handleNoticeImageUpload = async (e, idx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingNoticeIdx(idx);
    try {
      const url = await uploadImageToGCS(file, 'hunter');
      const next = [...noticeImages];
      if (idx < next.length) next[idx] = url;
      else next.push(url);
      setNoticeImages(next);
    } catch { alert('이미지 업로드 실패'); }
    finally { setUploadingNoticeIdx(null); }
  };

  // 인스타 이미지 업로드
  const handleInstaImageUpload = async (e, idx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingInstaIdx(idx);
    try {
      const url = await uploadImageToGCS(file, 'hunter');
      setInstaPosts(prev => prev.map((p, i) => i === idx ? { ...p, image: url } : p));
    } catch { alert('이미지 업로드 실패'); }
    finally { setUploadingInstaIdx(null); }
  };

  // 블로그 이미지 업로드
  const handleBlogImageUpload = async (e, idx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBlogIdx(idx);
    try {
      const url = await uploadImageToGCS(file, 'hunter');
      setBlogPosts(prev => prev.map((p, i) => i === idx ? { ...p, image: url } : p));
    } catch { alert('이미지 업로드 실패'); }
    finally { setUploadingBlogIdx(null); }
  };

  // 스토어 이미지 업로드
  const handleStoreImageUpload = async (e, idx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingStoreIdx(idx);
    try {
      const url = await uploadImageToGCS(file, 'hunter');
      setStoreItems(prev => prev.map((p, i) => i === idx ? { ...p, image: url } : p));
    } catch { alert('이미지 업로드 실패'); }
    finally { setUploadingStoreIdx(null); }
  };

  // 가게 검색
  useEffect(() => {
    if (!showPickModal) return;
    clearTimeout(pickSearchTimer.current);
    if (!pickSearch.trim()) { setPickSearchResults([]); return; }
    setPickSearchLoading(true);
    pickSearchTimer.current = setTimeout(async () => {
      try {
        const res = await api.get('/api/v1/admin/restaurants', { params: { search: pickSearch, limit: 20 } });
        const items = res.data?.data?.items ?? res.data?.data ?? res.data ?? [];
        setPickSearchResults(Array.isArray(items) ? items : []);
      } catch { setPickSearchResults([]); }
      finally { setPickSearchLoading(false); }
    }, 400);
  }, [pickSearch, showPickModal]);

  const togglePickRestaurant = (r) => {
    const alreadyIn = picksRestaurantIds.includes(r.id);
    if (alreadyIn) {
      setPicksRestaurantIds(prev => prev.filter(id => id !== r.id));
      setPicksRestaurants(prev => prev.filter(p => p.id !== r.id));
    } else {
      if (picksRestaurantIds.length >= MAX_PICKS) return;
      setPicksRestaurantIds(prev => [...prev, r.id]);
      setPicksRestaurants(prev => [...prev, { id: r.id, name: r.name, imageUrl: r.image_url_1 ?? r.imageUrl ?? null }]);
    }
  };

  const handleShuffle = async () => {
    setShuffling(true);
    try {
      const res = await api.get('/api/v1/admin/hunter-content/shuffle-picks');
      const picks = res.data?.data ?? res.data ?? [];
      setPicksRestaurantIds(picks.map(p => p.id));
      setPicksRestaurants(picks);
    } catch { alert('셔플 실패. 카츠헌터픽 가게가 없을 수 있습니다.'); }
    finally { setShuffling(false); }
  };

  const s = styles;

  if (loading) return <div style={s.loading}>불러오는 중...</div>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>🕵🏻‍♂️ 카츠헌터 탭 관리</h1>
        <button onClick={handleSave} disabled={saving} style={s.saveBtn}>
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
      {msg && <div style={{ ...s.msg, color: msg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{msg}</div>}

      {/* ── 1. 카츠헌터 한마디 ── */}
      <Section title="카츠헌터 한마디">
        <Field label="말풍선 텍스트">
          <input style={s.input} value={noticeText} onChange={e => setNoticeText(e.target.value)} placeholder="예) 새 맛집이 계속 추가되고 있어요! 🎉" />
        </Field>
        <Field label={`모달 이미지 (최대 ${MAX_NOTICE_IMAGES}장)`}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Array.from({ length: MAX_NOTICE_IMAGES }).map((_, idx) => (
              <ImageUploadCell
                key={idx}
                value={noticeImages[idx] ?? ''}
                onChange={url => {
                  const next = [...noticeImages];
                  if (url === '') next.splice(idx, 1);
                  else next[idx] = url;
                  setNoticeImages(next.filter(Boolean));
                }}
                uploading={uploadingNoticeIdx === idx}
                onUpload={e => handleNoticeImageUpload(e, idx)}
              />
            ))}
          </div>
        </Field>
        <Field label="모달 본문 내용">
          <textarea style={{ ...s.input, minHeight: 80 }} value={noticeBody} onChange={e => setNoticeBody(e.target.value)} placeholder="모달에서 표시될 본문 내용" />
        </Field>
      </Section>

      {/* ── 2. SNS 링크 ── */}
      <Section title="SNS 링크">
        <Field label="인스타그램 URL">
          <input style={s.input} value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} placeholder="https://www.instagram.com/katz_hunter/" />
        </Field>
        <Field label="블로그 URL">
          <input style={s.input} value={blogUrl} onChange={e => setBlogUrl(e.target.value)} placeholder="https://blog.naver.com/katz_hunter" />
        </Field>
      </Section>

      {/* ── 3. 추천 가게 픽 ── */}
      <Section title="추천 가게 픽">
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Field label="제목">
              <input style={s.input} value={picksTheme} onChange={e => setPicksTheme(e.target.value)} placeholder="예) 이번 주 히레카츠 픽" />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Field label="소제목">
              <input style={s.input} value={picksDesc} onChange={e => setPicksDesc(e.target.value)} placeholder="예) 담백하고 촉촉한 히레카츠의 정수" />
            </Field>
          </div>
        </div>
        <Field label={`선택된 가게 (${picksRestaurantIds.length}/${MAX_PICKS})`}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {picksRestaurants.map(r => (
              <div key={r.id} style={s.pickChip}>
                {r.imageUrl && <img src={r.imageUrl} alt="" style={{ width: 28, height: 28, borderRadius: 14, objectFit: 'cover' }} />}
                <span style={{ fontSize: 13 }}>{r.name}</span>
                <button onClick={() => togglePickRestaurant(r)} style={s.chipRemove}>×</button>
              </div>
            ))}
            {picksRestaurantIds.length < MAX_PICKS && (
              <button onClick={() => setShowPickModal(true)} style={s.addChipBtn}>+ 가게 추가</button>
            )}
          </div>
          <button onClick={handleShuffle} disabled={shuffling} style={s.shuffleBtn}>
            {shuffling ? '🔄 셔플 중...' : '🎲 셔플 (카츠헌터픽 랜덤 3개)'}
          </button>
        </Field>
      </Section>

      {/* ── 4. 인스타 포스트 ── */}
      <Section title={`인스타 포스트 (${instaPosts.length}/${MAX_INSTA})`}>
        {instaPosts.map((post, idx) => (
          <div key={post.id} style={s.listItem}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <ImageUploadCell
                value={post.image}
                onChange={url => setInstaPosts(prev => prev.map((p, i) => i === idx ? { ...p, image: url } : p))}
                uploading={uploadingInstaIdx === idx}
                onUpload={e => handleInstaImageUpload(e, idx)}
              />
              <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input style={s.input} placeholder="제목" value={post.title} onChange={e => setInstaPosts(prev => prev.map((p, i) => i === idx ? { ...p, title: e.target.value } : p))} />
                <input style={s.input} placeholder="소제목" value={post.subtitle} onChange={e => setInstaPosts(prev => prev.map((p, i) => i === idx ? { ...p, subtitle: e.target.value } : p))} />
                <input style={s.input} placeholder="URL (클릭 시 이동)" value={post.url} onChange={e => setInstaPosts(prev => prev.map((p, i) => i === idx ? { ...p, url: e.target.value } : p))} />
              </div>
            </div>
            <button onClick={() => setInstaPosts(prev => prev.filter((_, i) => i !== idx))} style={s.removeBtn}>삭제</button>
          </div>
        ))}
        {instaPosts.length < MAX_INSTA && (
          <button onClick={() => setInstaPosts(prev => [...prev, emptyInstaPost()])} style={s.addBtn}>+ 포스트 추가</button>
        )}
      </Section>

      {/* ── 5. 블로그 ── */}
      <Section title={`블로그 (${blogPosts.length}/${MAX_BLOG})`}>
        {blogPosts.map((post, idx) => (
          <div key={post.id} style={s.listItem}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <ImageUploadCell
                value={post.image}
                onChange={url => setBlogPosts(prev => prev.map((p, i) => i === idx ? { ...p, image: url } : p))}
                uploading={uploadingBlogIdx === idx}
                onUpload={e => handleBlogImageUpload(e, idx)}
              />
              <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input style={s.input} placeholder="제목" value={post.title} onChange={e => setBlogPosts(prev => prev.map((p, i) => i === idx ? { ...p, title: e.target.value } : p))} />
                <input style={s.input} placeholder="소제목" value={post.subtitle} onChange={e => setBlogPosts(prev => prev.map((p, i) => i === idx ? { ...p, subtitle: e.target.value } : p))} />
                <input style={s.input} placeholder="URL (클릭 시 이동)" value={post.url} onChange={e => setBlogPosts(prev => prev.map((p, i) => i === idx ? { ...p, url: e.target.value } : p))} />
              </div>
            </div>
            <button onClick={() => setBlogPosts(prev => prev.filter((_, i) => i !== idx))} style={s.removeBtn}>삭제</button>
          </div>
        ))}
        {blogPosts.length < MAX_BLOG && (
          <button onClick={() => setBlogPosts(prev => [...prev, emptyBlogPost()])} style={s.addBtn}>+ 포스트 추가</button>
        )}
      </Section>

      {/* ── 6. 스마트스토어 ── */}
      <Section title={`스마트스토어 (${storeItems.length}/${MAX_STORE})`}>
        {storeItems.map((item, idx) => (
          <div key={item.id} style={s.listItem}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <ImageUploadCell
                value={item.image}
                onChange={url => setStoreItems(prev => prev.map((p, i) => i === idx ? { ...p, image: url } : p))}
                uploading={uploadingStoreIdx === idx}
                onUpload={e => handleStoreImageUpload(e, idx)}
              />
              <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input style={s.input} placeholder="상품명" value={item.title} onChange={e => setStoreItems(prev => prev.map((p, i) => i === idx ? { ...p, title: e.target.value } : p))} />
                <input style={s.input} placeholder="가격 (예: 11,500원)" value={item.price} onChange={e => setStoreItems(prev => prev.map((p, i) => i === idx ? { ...p, price: e.target.value } : p))} />
              </div>
            </div>
            <button onClick={() => setStoreItems(prev => prev.filter((_, i) => i !== idx))} style={s.removeBtn}>삭제</button>
          </div>
        ))}
        {storeItems.length < MAX_STORE && (
          <button onClick={() => setStoreItems(prev => [...prev, emptyStoreItem()])} style={s.addBtn}>+ 상품 추가</button>
        )}
      </Section>

      {/* 하단 저장 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, paddingBottom: 60 }}>
        <button onClick={handleSave} disabled={saving} style={{ ...s.saveBtn, padding: '12px 32px', fontSize: 16 }}>
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>

      {/* 가게 선택 모달 */}
      {showPickModal && (
        <div style={s.modalOverlay} onClick={() => setShowPickModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>가게 선택 ({picksRestaurantIds.length}/{MAX_PICKS})</h3>
              <button onClick={() => setShowPickModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <input
              style={{ ...s.input, marginBottom: 12 }}
              placeholder="가게 이름 검색..."
              value={pickSearch}
              onChange={e => setPickSearch(e.target.value)}
              autoFocus
            />
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {pickSearchLoading && <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>검색 중...</div>}
              {!pickSearchLoading && pickSearch && pickSearchResults.length === 0 && (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>검색 결과 없음</div>
              )}
              {!pickSearch && <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>가게 이름을 검색하세요</div>}
              {pickSearchResults.map(r => {
                const selected = picksRestaurantIds.includes(r.id);
                return (
                  <div
                    key={r.id}
                    onClick={() => togglePickRestaurant(r)}
                    style={{ ...s.pickRow, background: selected ? '#fef3c7' : '#fff', cursor: (!selected && picksRestaurantIds.length >= MAX_PICKS) ? 'not-allowed' : 'pointer' }}
                  >
                    {r.image_url_1 && <img src={r.image_url_1} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover' }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{r.area}</div>
                    </div>
                    {selected && <span style={{ color: '#d97706', fontWeight: 700 }}>✓</span>}
                  </div>
                );
              })}
            </div>
            <button onClick={() => setShowPickModal(false)} style={{ ...s.saveBtn, width: '100%', marginTop: 12 }}>완료</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  page: { padding: '24px', maxWidth: 860, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  msg: { padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', marginBottom: 12, fontSize: 14 },
  loading: { padding: 40, textAlign: 'center', color: '#6b7280' },
  section: { background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px 24px', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', color: '#111827' },
  field: { marginBottom: 14 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' },
  saveBtn: { background: '#d6483e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  shuffleBtn: { background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  addBtn: { background: '#f3f4f6', color: '#374151', border: '1px dashed #d1d5db', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', marginTop: 8 },
  removeBtn: { background: 'none', border: 'none', color: '#ef4444', fontSize: 13, cursor: 'pointer', marginTop: 6 },
  listItem: { background: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 10, border: '1px solid #e5e7eb' },
  pickChip: { display: 'flex', alignItems: 'center', gap: 6, background: '#fef3c7', borderRadius: 20, padding: '4px 10px', fontSize: 13, border: '1px solid #fcd34d' },
  chipRemove: { background: 'none', border: 'none', color: '#92400e', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 },
  addChipBtn: { display: 'flex', alignItems: 'center', gap: 4, background: '#f3f4f6', border: '1px dashed #d1d5db', borderRadius: 20, padding: '4px 12px', fontSize: 13, cursor: 'pointer', color: '#374151' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { background: '#fff', borderRadius: 16, padding: 24, width: 420, maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' },
  pickRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, marginBottom: 4, border: '1px solid #f3f4f6' },
};
