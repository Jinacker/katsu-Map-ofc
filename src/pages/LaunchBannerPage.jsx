import { useEffect, useRef, useState } from 'react';
import apiClient from '../api/axios';
import { uploadImageToGCS } from '../api/gcs';
import PushDestinationPicker from '../components/PushDestinationPicker';
import { buildLaunchBannerPayload, EMPTY_LAUNCH_BANNER_FORM, launchBannerToForm } from '../utils/launchBannerForm';
import './LaunchBannerPage.css';

function imageRatio(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image.naturalWidth / image.naturalHeight); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 읽지 못했습니다.')); };
    image.src = url;
  });
}

export default function LaunchBannerPage() {
  const [form, setForm] = useState(EMPTY_LAUNCH_BANNER_FORM);
  const [catalog, setCatalog] = useState(null);
  const [generation, setGeneration] = useState(null);
  const [revision, setRevision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const savingRef = useRef(false);
  const loadVersionRef = useRef(0);
  const selectedDestination = catalog?.destinations.find((item) => item.target === form.target);

  const applySettings = (data, destinations) => {
    setForm(launchBannerToForm(data.config, destinations));
    setGeneration(data.generation);
    setRevision(data.config.revision);
    if (data.config.imageUrl !== form.imageUrl) {
      setPreviewError(false);
      setPreviewLoading(Boolean(data.config.imageUrl));
    }
  };

  const load = async () => {
    const version = ++loadVersionRef.current;
    setLoading(true);
    setLoadError('');
    try {
      const [settings, destinations] = await Promise.all([
        apiClient.get('/api/v1/admin/launch-banner'), apiClient.get('/api/v1/admin/push/destinations'),
      ]);
      if (version !== loadVersionRef.current) return;
      const data = settings.data.data;
      const destinationCatalog = destinations.data.data;
      if (data?.config?.schemaVersion !== 1 || destinationCatalog?.version !== 1
        || !Array.isArray(destinationCatalog.destinations)) throw new Error('지원하지 않는 설정 형식입니다.');
      setCatalog(destinationCatalog);
      applySettings(data, destinationCatalog);
    } catch (error) {
      if (version === loadVersionRef.current) setLoadError(error.response?.data?.message || error.message || '설정을 불러오지 못했습니다.');
    } finally { if (version === loadVersionRef.current) setLoading(false); }
  };

  useEffect(() => {
    load();
    return () => { loadVersionRef.current += 1; };
  }, []);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage('');
    if (key === 'imageUrl') { setPreviewError(false); setPreviewLoading(Boolean(value)); }
  };

  const upload = async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) {
      setMessage('20MB 이하의 JPG, PNG, WebP 이미지를 선택해주세요.');
      input.value = '';
      return;
    }
    setUploading(true);
    setMessage('');
    try {
      const ratio = await imageRatio(file);
      if (ratio < 0.2 || ratio > 5) throw new Error('이미지의 가로/세로 비율은 0.2~5 사이여야 합니다.');
      const imageUrl = await uploadImageToGCS(file, 'launch-banners');
      setForm((current) => ({ ...current, imageUrl, imageAspectRatio: ratio }));
      setPreviewError(false);
      setPreviewLoading(true);
    } catch (error) { setMessage(error.message || '이미지 업로드에 실패했습니다.'); }
    finally { setUploading(false); input.value = ''; }
  };

  const save = async (event) => {
    event.preventDefault();
    if (savingRef.current || uploading) return;
    let payload;
    try { payload = buildLaunchBannerPayload(form, generation, catalog); }
    catch (error) { setMessage(error.message); return; }
    if (form.enabled && (previewError || previewLoading)) { setMessage('배너 이미지를 확인한 뒤 저장해주세요.'); return; }
    savingRef.current = true;
    setSaving(true);
    setMessage('');
    try {
      const response = await apiClient.put('/api/v1/admin/launch-banner', payload);
      const next = response.data.data;
      applySettings(next, catalog);
      setMessage(next.config.revision === revision ? '변경 사항이 없어 기존 배너를 유지했습니다.' : '저장했습니다. 변경된 배너는 숨긴 사용자에게도 다시 표시됩니다.');
    } catch (error) {
      setMessage(error.response?.data?.message || '저장에 실패했습니다. 입력 내용은 유지됩니다.');
    } finally { savingRef.current = false; setSaving(false); }
  };

  if (loading) return <div className="launch-banner-page">배너 설정을 불러오는 중...</div>;
  if (loadError) return <div className="launch-banner-page"><h1>앱 배너</h1><p role="alert">{loadError}</p><button onClick={load}>다시 불러오기</button></div>;

  return (
    <div className="launch-banner-page">
      <header className="launch-banner-header"><div><h1>앱 배너</h1><p>앱 시작 시 보여줄 배너 하나를 설정합니다.</p></div>
        <button type="button" disabled={saving || uploading} onClick={load}>다시 불러오기</button>
      </header>
      {message && <p className="launch-banner-message" role="status">{message}</p>}
      <form onSubmit={save} className="launch-banner-grid">
        <fieldset disabled={saving || uploading} className="launch-banner-fields">
          <label className="launch-banner-toggle"><input type="checkbox" checked={form.enabled} onChange={(event) => update('enabled', event.target.checked)} />배너 노출</label>
          <label>배너 제목<input value={form.title} maxLength={80} placeholder="예: 원육 품종 가이드" onChange={(event) => update('title', event.target.value)} /></label>
          <label>배너 이미지<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} /></label>
          <label>이미지 주소<input type="url" value={form.imageUrl} maxLength={2048} placeholder="https://..." onChange={(event) => update('imageUrl', event.target.value)} /></label>
          <label>클릭 시 이동할 화면<select value={form.target} onChange={(event) => {
            setForm((current) => ({ ...current, target: event.target.value, targetId: '' })); setMessage('');
          }}><option value="">선택해주세요</option>{catalog.destinations.map((destination) => <option key={destination.target} value={destination.target}>{destination.label}</option>)}</select></label>
          {selectedDestination?.idKey && <PushDestinationPicker key={form.target} idKey={selectedDestination.idKey} value={form.targetId} onChange={(value) => update('targetId', value)} />}
          <p className="launch-banner-hint">‘다시 보지 않기’는 현재 배너에만 적용됩니다. 이미지·제목·이동 화면·노출 설정을 변경해 저장하면 다시 표시됩니다.</p>
          <p className="launch-banner-hint">앱을 새로 실행할 때 표시되며, 변경 반영에는 최대 1분 정도 걸릴 수 있습니다.</p>
          <button type="submit" className="launch-banner-save">{saving ? '저장 중...' : uploading ? '이미지 업로드 중...' : '저장하기'}</button>
        </fieldset>
        <section className="launch-banner-preview" aria-label="배너 미리보기">
          <h2>미리보기</h2>
          <div className="launch-banner-preview-overlay"><div className="launch-banner-preview-card">
            {form.imageUrl ? <img src={form.imageUrl} alt={form.title || '배너'} onError={() => { setPreviewError(true); setPreviewLoading(false); }} onLoad={(event) => {
              setPreviewError(false);
              setPreviewLoading(false);
              const ratio = event.currentTarget.naturalWidth / event.currentTarget.naturalHeight;
              if (ratio >= 0.2 && ratio <= 5) setForm((current) => ({ ...current, imageAspectRatio: ratio }));
              else setPreviewError(true);
            }} /> : <div className="launch-banner-preview-empty">배너 이미지를 선택해주세요</div>}
            <div className="launch-banner-preview-actions"><span>다시 보지 않기</span><span>닫기</span></div>
          </div></div>
          {previewError && <p role="alert">이미지를 표시하지 못했습니다. 주소와 이미지 비율을 확인해주세요.</p>}
          <p className="launch-banner-hint">{form.enabled ? '노출 설정 ON' : '노출 설정 OFF'}</p>
        </section>
      </form>
    </div>
  );
}
