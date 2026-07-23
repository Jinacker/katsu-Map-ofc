import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const SATISFACTION_LABELS = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * 어드민 공용 유저 프로필 팝업.
 * 랭킹 탭·유저 관리에서 유저 클릭 시 띄운다. (앱 커뮤니티 프로필 화면 참고)
 */
export default function UserProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    setProfile(null);
    api
      .get(`/api/v1/admin/users/${userId}/profile`)
      .then((res) => setProfile(res.data?.data ?? res.data))
      .catch((e) => setError(e.response?.data?.message ?? e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) return null;

  return (
    // 배경(오버레이)을 직접 누른 경우에만 닫는다.
    // click 대신 mousedown 기준: 팝업 안에서 드래그하다 배경에서 떼도 닫히지 않게.
    <div
      style={s.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={s.modal}>
        <button onClick={onClose} style={s.closeBtn}>×</button>

        {loading ? (
          <div style={s.center}>불러오는 중...</div>
        ) : error ? (
          <div style={s.center}>불러오기 실패: {error}</div>
        ) : profile ? (
          <>
            {/* 프로필 헤더 */}
            <div style={s.profileHeader}>
              {profile.profilePhotoUrl ? (
                <img src={profile.profilePhotoUrl} alt="" style={s.avatar} />
              ) : (
                <div style={s.avatarPlaceholder}>
                  {(profile.nickname || '?').slice(0, 1)}
                </div>
              )}
              <div style={s.headerInfo}>
                <div style={s.nameRow}>
                  <span style={s.nickname}>{profile.nickname}</span>
                  <span style={{
                    ...s.publicBadge,
                    ...(profile.isProfilePublic ? s.publicOn : s.publicOff),
                  }}>
                    {profile.isProfilePublic ? '공개' : '비공개'}
                  </span>
                </div>
                <div style={s.userId}>ID {profile.id}</div>
                <div style={s.rankRow}>
                  <span style={s.rankChip}>
                    전체 {profile.overallRank != null ? `${profile.overallRank}위` : '-'}
                  </span>
                  <span style={s.rankChip}>
                    {profile.monthlyRankMonth}월 {profile.monthlyRank != null ? `${profile.monthlyRank}위` : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* 통계 */}
            <div style={s.statsRow}>
              <div style={s.statBox}>
                <div style={s.statValue}>{profile.recordCount}</div>
                <div style={s.statLabel}>기록</div>
              </div>
              <div style={s.statBox}>
                <div style={s.statValue}>{profile.favoriteCount}</div>
                <div style={s.statLabel}>즐겨찾기</div>
              </div>
              <div style={s.statBox}>
                <div style={s.statValue}>{profile.reportCount}</div>
                <div style={s.statLabel}>제보</div>
              </div>
            </div>

            {/* 가입/접속 */}
            <div style={s.metaRow}>
              <span>가입 {formatDate(profile.createdAt)}</span>
              <span style={s.metaDot}>·</span>
              <span>마지막 접속 {formatDateTime(profile.lastAccessedAt)}</span>
            </div>

            {/* 전체 기록 */}
            <div style={s.sectionTitle}>기록 {(profile.records ?? []).length}개</div>
            {(profile.records ?? []).length === 0 ? (
              <div style={s.emptyRecords}>기록이 없습니다.</div>
            ) : (
              <div style={s.records}>
                {profile.records.map((r) => (
                  <div key={r.id} style={s.record}>
                    {r.photoUrl ? (
                      <img src={r.photoUrl} alt="" style={s.recordPhoto} />
                    ) : (
                      <div style={s.recordNoPhoto}>-</div>
                    )}
                    <div style={s.recordBody}>
                      <div style={s.recordTop}>
                        <span style={s.recordName}>{r.restaurantName}</span>
                        {r.satisfaction > 0 && (
                          <span style={s.recordStars}>{SATISFACTION_LABELS[r.satisfaction]}</span>
                        )}
                        {r.isPrivate && <span style={s.privateTag}>비공개</span>}
                      </div>
                      <div style={s.recordMeta}>
                        {r.visitDate}
                        {r.menuName ? ` · ${r.menuName}` : ''}
                      </div>
                      {r.review && <div style={s.recordReview}>{r.review}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16,
  },
  modal: {
    position: 'relative', background: '#fff', borderRadius: 16,
    width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto',
    padding: 24,
  },
  closeBtn: {
    position: 'absolute', top: 12, right: 14, border: 'none', background: 'none',
    fontSize: 26, color: '#9ca3af', cursor: 'pointer', lineHeight: 1,
  },
  center: { padding: 60, textAlign: 'center', color: '#9ca3af' },
  profileHeader: { display: 'flex', gap: 16, alignItems: 'center', marginBottom: 18 },
  avatar: { width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  avatarPlaceholder: {
    width: 64, height: 64, borderRadius: '50%', background: '#f3f4f6', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 24, fontWeight: 700, color: '#9ca3af',
  },
  headerInfo: { minWidth: 0 },
  nameRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  nickname: { fontSize: 18, fontWeight: 700, color: '#111827' },
  publicBadge: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 },
  publicOn: { color: '#16a34a', background: '#dcfce7' },
  publicOff: { color: '#6b7280', background: '#f3f4f6' },
  userId: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  rankRow: { display: 'flex', gap: 6, marginTop: 8 },
  rankChip: {
    fontSize: 12, fontWeight: 600, color: '#C8102E', background: '#FFF5F5',
    padding: '3px 10px', borderRadius: 8,
  },
  statsRow: { display: 'flex', gap: 8, marginBottom: 14 },
  statBox: {
    flex: 1, background: '#f9fafb', borderRadius: 10, padding: '12px 0',
    textAlign: 'center',
  },
  statValue: { fontSize: 18, fontWeight: 700, color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  metaRow: {
    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
    color: '#9ca3af', marginBottom: 20, flexWrap: 'wrap',
  },
  metaDot: { color: '#d1d5db' },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 },
  emptyRecords: { padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 },
  records: { display: 'flex', flexDirection: 'column', gap: 8 },
  record: {
    display: 'flex', gap: 10, border: '1px solid #f3f4f6', borderRadius: 10,
    padding: 10,
  },
  recordPhoto: { width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 },
  recordNoPhoto: {
    width: 48, height: 48, borderRadius: 8, background: '#f3f4f6', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db',
  },
  recordBody: { minWidth: 0, flex: 1 },
  recordTop: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  recordName: { fontSize: 14, fontWeight: 600, color: '#111827' },
  recordStars: { fontSize: 11, color: '#d97706', letterSpacing: 1 },
  privateTag: {
    fontSize: 10, fontWeight: 700, color: '#6b7280', background: '#f3f4f6',
    padding: '1px 6px', borderRadius: 4,
  },
  recordMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  recordReview: {
    fontSize: 12, color: '#374151', marginTop: 4, lineHeight: 1.5,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
};
