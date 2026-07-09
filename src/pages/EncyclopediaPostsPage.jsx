import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/axios';
import './EncyclopediaPostsPage.css';

const emptyForm = {
  title: '',
  summary: '',
  category: '돈가스 입문',
  thumbnailUrl: '',
  status: 'draft',
  bodyMarkdown: '',
};

const unwrap = (response) => response.data?.data ?? response.data;

const ENCYCLOPEDIA_CATEGORIES = [
  '돈가스 입문',
  '부위와 고기',
  '튀김과 조리',
  '소스와 곁들임',
  '스타일 사전',
  '맛있게 먹는 법',
  '가게 고르는 법',
  '돈가스 용어',
  '돈가스 이야기',
];

const CATEGORY_EMOJIS = {
  '돈가스 입문': '🍽️',
  '부위와 고기': '🥩',
  '튀김과 조리': '🍤',
  '소스와 곁들임': '🥣',
  '스타일 사전': '📚',
  '맛있게 먹는 법': '😋',
  '가게 고르는 법': '🧭',
  '돈가스 용어': '📖',
  '돈가스 이야기': '🐷',
};

const getCategoryEmoji = (category) => CATEGORY_EMOJIS[category] ?? '📖';

const parseInlineMarkdown = (text, keyPrefix) => {
  const tokenRegex = /(!?\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = String(text).split(tokenRegex).filter(Boolean);

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    const imageMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      const [, alt, src] = imageMatch;
      if (!/^https?:\/\//i.test(src)) return part;
      return <img key={key} src={src} alt={alt} className="markdown-preview-image" />;
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      if (!/^https?:\/\//i.test(href)) return part;
      return (
        <a key={key} href={href} target="_blank" rel="noreferrer">
          {label}
        </a>
      );
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }

    return part;
  });
};

const renderMarkdownPreview = (markdown) => {
  const source = String(markdown || '').replace(/\r\n/g, '\n').trim();
  if (!source) {
    return <p className="markdown-placeholder">마크다운 본문 미리보기 영역</p>;
  }

  const lines = source.split('\n');
  const blocks = [];
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(' ');
    blocks.push(
      <p key={`p-${blocks.length}`}>
        {parseInlineMarkdown(text, `p-${blocks.length}`)}
      </p>,
    );
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    const ListTag = list.type === 'ol' ? 'ol' : 'ul';
    blocks.push(
      <ListTag key={`list-${blocks.length}`}>
        {list.items.map((item, index) => (
          <li key={`${list.type}-${index}`}>
            {parseInlineMarkdown(item, `${list.type}-${blocks.length}-${index}`)}
          </li>
        ))}
      </ListTag>,
    );
    list = null;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (line.startsWith('```')) {
      flushParagraph();
      flushList();
      const codeLines = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      blocks.push(
        <pre key={`code-${blocks.length}`} className="markdown-code-block">
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^---+$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push(<hr key={`hr-${blocks.length}`} />);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const HeadingTag = `h${heading[1].length + 1}`;
      blocks.push(
        <HeadingTag key={`h-${blocks.length}`}>
          {parseInlineMarkdown(heading[2], `h-${blocks.length}`)}
        </HeadingTag>,
      );
      continue;
    }

    const quote = line.match(/^>\s?(.+)$/);
    if (quote) {
      flushParagraph();
      flushList();
      blocks.push(
        <blockquote key={`quote-${blocks.length}`}>
          {parseInlineMarkdown(quote[1], `quote-${blocks.length}`)}
        </blockquote>,
      );
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      if (!list || list.type !== 'ul') {
        flushList();
        list = { type: 'ul', items: [] };
      }
      list.items.push(unordered[1]);
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (!list || list.type !== 'ol') {
        flushList();
        list = { type: 'ol', items: [] };
      }
      list.items.push(ordered[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
};

export default function EncyclopediaPostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bodyImageUploading, setBodyImageUploading] = useState(false);
  const [bodyImageUrl, setBodyImageUrl] = useState('');
  const [isThumbnailDragOver, setIsThumbnailDragOver] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || b.id - a.id),
    [posts],
  );

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/admin/encyclopedia-posts');
      const data = unwrap(response);
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage('백과사전 글 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingPost(null);
    setForm(emptyForm);
    setMessage('');
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setForm({
      title: post.title ?? '',
      summary: post.summary ?? '',
      category: post.category ?? '돈가스 입문',
      thumbnailUrl: post.thumbnailUrl ?? '',
      status: post.status ?? 'draft',
      bodyMarkdown: post.bodyMarkdown ?? '',
    });
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayload = () => ({
    title: form.title,
    summary: form.summary,
    category: form.category,
    emoji: getCategoryEmoji(form.category),
    thumbnailUrl: form.thumbnailUrl,
    status: form.status,
    bodyMarkdown: form.bodyMarkdown,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const doneMessage = editingPost ? '수정 완료' : '생성 완료';
      if (editingPost) {
        await apiClient.put(`/api/v1/admin/encyclopedia-posts/${editingPost.id}`, buildPayload());
      } else {
        await apiClient.post('/api/v1/admin/encyclopedia-posts', buildPayload());
      }
      resetForm();
      await fetchPosts();
      setMessage(doneMessage);
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const uploadThumbnailFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);
    setMessage('');

    try {
      const response = await apiClient.post('/api/v1/admin/encyclopedia-posts/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = unwrap(response);
      handleChange('thumbnailUrl', data.url);
      setMessage('이미지 업로드 완료');
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.message || '이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    await uploadThumbnailFile(file);
    event.target.value = '';
  };

  const uploadBodyImageFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);
    setBodyImageUploading(true);
    setMessage('');

    try {
      const response = await apiClient.post('/api/v1/admin/encyclopedia-posts/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = unwrap(response);
      setBodyImageUrl(data.url);
      setMessage('본문 이미지 URL 생성 완료');
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.message || '이미지 업로드에 실패했습니다.');
    } finally {
      setBodyImageUploading(false);
    }
  };

  const handleBodyImageUpload = async (event) => {
    const file = event.target.files?.[0];
    await uploadBodyImageFile(file);
    event.target.value = '';
  };

  const handleBodyImagePaste = async (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const file = item.getAsFile();
        await uploadBodyImageFile(file);
        return;
      }
    }
  };

  const handleThumbnailPaste = async (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const file = item.getAsFile();
        await uploadThumbnailFile(file);
        return;
      }
    }
  };

  const handleThumbnailDrop = async (event) => {
    event.preventDefault();
    setIsThumbnailDragOver(false);

    const file = event.dataTransfer?.files?.[0];
    await uploadThumbnailFile(file);
  };

  const handleThumbnailDragOver = (event) => {
    event.preventDefault();
    setIsThumbnailDragOver(true);
  };

  const handleThumbnailDragLeave = () => {
    setIsThumbnailDragOver(false);
  };

  const handlePublish = async (post) => {
    try {
      await apiClient.patch(`/api/v1/admin/encyclopedia-posts/${post.id}/publish`);
      await fetchPosts();
      setMessage('발행 완료');
    } catch (error) {
      console.error(error);
      setMessage('발행에 실패했습니다.');
    }
  };

  const handleUnpublish = async (post) => {
    try {
      await apiClient.patch(`/api/v1/admin/encyclopedia-posts/${post.id}/unpublish`);
      await fetchPosts();
      setMessage('발행 해제 완료');
    } catch (error) {
      console.error(error);
      setMessage('발행 해제에 실패했습니다.');
    }
  };

  const handleDelete = async (post) => {
    if (!confirm(`"${post.title}" 글을 삭제할까요?`)) return;
    try {
      await apiClient.delete(`/api/v1/admin/encyclopedia-posts/${post.id}`);
      if (editingPost?.id === post.id) resetForm();
      await fetchPosts();
      setMessage('삭제 완료');
    } catch (error) {
      console.error(error);
      setMessage('삭제에 실패했습니다.');
    }
  };

  const handleMovePost = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sortedPosts.length) return;

    const reordered = [...sortedPosts];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    const optimistic = reordered.map((post, orderIndex) => ({
      ...post,
      displayOrder: orderIndex,
    }));
    setPosts(optimistic);
    setMessage('');

    try {
      await Promise.all(
        optimistic.map((post) =>
          apiClient.put(`/api/v1/admin/encyclopedia-posts/${post.id}`, {
            displayOrder: post.displayOrder,
          }),
        ),
      );
      await fetchPosts();
      setMessage('노출 순서 변경 완료');
    } catch (error) {
      console.error(error);
      setMessage('노출 순서 변경에 실패했습니다.');
      await fetchPosts();
    }
  };

  if (loading) {
    return (
      <div className="encyclopedia-page">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>백과사전 글 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="encyclopedia-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">백과사전 관리</h1>
          <p className="page-subtitle">앱 백과사전 탭에 노출될 마크다운 게시글을 관리합니다.</p>
        </div>
        <button className="secondary-btn" type="button" onClick={resetForm}>새 글 작성</button>
      </div>

      {message ? <div className="encyclopedia-message">{message}</div> : null}

      <div className="encyclopedia-editor-grid">
        <form className="encyclopedia-form" onSubmit={handleSubmit}>
          <div className="form-title-row">
            <h2>{editingPost ? '게시글 수정' : '게시글 작성'}</h2>
            <span className={`post-status ${form.status}`}>{form.status === 'published' ? '발행' : '임시저장'}</span>
          </div>

          <div className="form-row two">
            <label>
              제목 *
              <input value={form.title} onChange={(e) => handleChange('title', e.target.value)} maxLength={120} required />
            </label>
            <label>
              카테고리 *
              <select value={form.category} onChange={(e) => handleChange('category', e.target.value)} required>
                {ENCYCLOPEDIA_CATEGORIES.includes(form.category) ? null : (
                  <option value={form.category}>{form.category}</option>
                )}
                {ENCYCLOPEDIA_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {getCategoryEmoji(category)} {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            요약 *
            <textarea value={form.summary} onChange={(e) => handleChange('summary', e.target.value)} maxLength={300} rows={3} required />
          </label>

          <div className="form-row single">
            <label>
              상태
              <select value={form.status} onChange={(e) => handleChange('status', e.target.value)}>
                <option value="draft">임시저장</option>
                <option value="published">발행</option>
              </select>
            </label>
          </div>

          <label>
            썸네일 이미지 URL
            <div
              className={`thumbnail-row ${isThumbnailDragOver ? 'drag-over' : ''}`}
              onDragOver={handleThumbnailDragOver}
              onDragLeave={handleThumbnailDragLeave}
              onDrop={handleThumbnailDrop}
            >
              <input
                value={form.thumbnailUrl}
                onChange={(e) => handleChange('thumbnailUrl', e.target.value)}
                onPaste={handleThumbnailPaste}
                placeholder="URL 직접 입력, 이미지 복붙 또는 드래그"
              />
              <label className={`encyclopedia-upload-btn ${uploading ? 'disabled' : ''}`}>
                {uploading ? '업로드 중' : 'GCP 업로드'}
                <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </label>

          <label>
            본문 Markdown *
            <textarea
              className="markdown-input"
              value={form.bodyMarkdown}
              onChange={(e) => handleChange('bodyMarkdown', e.target.value)}
              placeholder="# 제목&#10;&#10;본문을 마크다운으로 작성하세요."
              required
            />
          </label>

          <div className="form-actions">
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
            {editingPost ? <button type="button" className="secondary-btn" onClick={resetForm}>취소</button> : null}
          </div>
        </form>

        <aside className="encyclopedia-preview">
          <h2>마크다운 본문 미리보기</h2>
          <div className="markdown-preview">{renderMarkdownPreview(form.bodyMarkdown)}</div>

          <div className="body-image-uploader">
            <div>
              <h3>본문에 넣을 이미지 URL 뽑기</h3>
              <p>URL을 직접 넣거나 이미지를 복붙/업로드하면 아래에 마크다운용 URL이 나옵니다.</p>
            </div>

            <div className="body-image-input-row">
              <input
                value={bodyImageUrl}
                onChange={(event) => setBodyImageUrl(event.target.value)}
                onPaste={handleBodyImagePaste}
                placeholder="이미지 URL 직접 입력 또는 이미지 복붙"
              />
              <label className={`encyclopedia-upload-btn body-image-upload-btn ${bodyImageUploading ? 'disabled' : ''}`}>
                {bodyImageUploading ? '업로드 중' : '이미지 업로드'}
                <input type="file" accept="image/*" onChange={handleBodyImageUpload} disabled={bodyImageUploading} />
              </label>
            </div>

            {bodyImageUrl ? (
              <div className="body-image-result">
                <label>
                  URL
                  <input value={bodyImageUrl} readOnly onFocus={(event) => event.target.select()} />
                </label>
                <label>
                  마크다운에 붙여넣기
                  <textarea
                    value={`![본문 이미지](${bodyImageUrl})`}
                    readOnly
                    onFocus={(event) => event.target.select()}
                  />
                </label>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <section className="encyclopedia-list">
        <div className="section-header">
          <h2>등록된 글 ({sortedPosts.length})</h2>
        </div>

        {sortedPosts.length === 0 ? (
          <div className="empty-state">등록된 백과사전 글이 없습니다.</div>
        ) : (
          <div className="post-table">
            {sortedPosts.map((post) => (
              <article key={post.id} className="post-row">
                <div className="post-order-controls">
                  <button
                    type="button"
                    onClick={() => handleMovePost(sortedPosts.findIndex((item) => item.id === post.id), -1)}
                    disabled={sortedPosts[0]?.id === post.id}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMovePost(sortedPosts.findIndex((item) => item.id === post.id), 1)}
                    disabled={sortedPosts[sortedPosts.length - 1]?.id === post.id}
                  >
                    ▼
                  </button>
                </div>
                <div className="post-thumb">
                  {post.thumbnailUrl ? <img src={post.thumbnailUrl} alt="" /> : <span>{post.emoji || '📖'}</span>}
                </div>
                <div className="post-main">
                  <div className="post-meta">
                    <span className={`post-status ${post.status}`}>{post.status === 'published' ? '발행' : '임시저장'}</span>
                    <span>{post.category}</span>
                  </div>
                  <h3>{post.title}</h3>
                  <p>{post.summary}</p>
                </div>
                <div className="post-actions">
                  {post.status === 'published' ? (
                    <button type="button" className="secondary-btn small" onClick={() => handleUnpublish(post)}>발행 해제</button>
                  ) : (
                    <button type="button" className="primary-btn small" onClick={() => handlePublish(post)}>발행</button>
                  )}
                  <button type="button" className="secondary-btn small" onClick={() => handleEdit(post)}>수정</button>
                  <button type="button" className="danger-btn small" onClick={() => handleDelete(post)}>삭제</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
