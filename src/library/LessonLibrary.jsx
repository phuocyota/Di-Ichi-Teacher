import React, { useEffect, useRef, useState } from 'react'
import { libraryRequest } from '../services/libraryApi.js'
import './LessonLibrary.css'

const blank = { title: '', description: '', subject: '', grade: '', topic: '', status: 'draft', classIds: [], audiences: ['TEACHER', 'STUDENT'] }
const statuses = { draft: 'Bản nháp', published: 'Đã xuất bản', archived: 'Ngừng sử dụng' }
const toggle = (values, value) => values.includes(value) ? values.filter(v => v !== value) : [...values, value]

export default function LessonLibrary({ manage = false }) {
  const [options, setOptions] = useState(null), [items, setItems] = useState([]), [total, setTotal] = useState(0)
  const [query, setQuery] = useState({ page: 1, search: '', subject: '', grade: '', status: '' })
  const [filters, setFilters] = useState({ search: '', subject: '', grade: '', status: '' })
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0)
  const [selected, setSelected] = useState(null), [form, setForm] = useState(null), [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(''), [link, setLink] = useState({ name: '', url: '' })
  const [preview, setPreview] = useState(null), [notice, setNotice] = useState(''), [confirmDelete, setConfirmDelete] = useState(null)
  const previewUrl = useRef(null), serial = useRef(0)
  const canManage = manage && options?.canManage
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    Promise.all([
      libraryRequest('/options', { signal: controller.signal }),
      libraryRequest('?' + new URLSearchParams(Object.fromEntries(Object.entries({ ...query, size: 12 }).filter(([, v]) => v !== ''))), { signal: controller.signal }),
    ]).then(([opts, result]) => {
      if (controller.signal.aborted) return
      if (!Array.isArray(opts.classes) || !Array.isArray(result.items) || !Number.isInteger(result.total)) throw new Error('Dữ liệu thư viện không hợp lệ')
      setOptions(opts); setItems(result.items); setTotal(result.total)
    }).catch(e => { if (!controller.signal.aborted) setError(e.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [query, revision])
  useEffect(() => () => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current) }, [])
  const change = e => setForm(v => ({ ...v, [e.target.name]: e.target.value }))
  const close = () => { serial.current++; setSelected(null); setForm(null); setActionError(''); setConfirmDelete(null); setLink({ name: '', url: '' }) }
  const open = async item => {
    const current = ++serial.current
    setBusy(true); setActionError(''); setNotice('')
    try {
      const data = await libraryRequest('/' + item.id)
      if (serial.current !== current) return
      setSelected(data); setForm({ ...blank, ...data })
    } catch (e) { setNotice(e.message) } finally { setBusy(false) }
  }
  const act = async work => {
    setBusy(true); setActionError(''); setNotice('')
    try { await work(); setRevision(v => v + 1) } catch(e) { setActionError(e.message) } finally { setBusy(false) }
  }
  const save = e => {
    e.preventDefault()
    act(async () => {
      const payload = Object.fromEntries(Object.keys(blank).map(key => [key, form[key]]))
      const saved = await libraryRequest(selected ? '/' + selected.id : '', { method: selected ? 'PUT' : 'POST', body: payload })
      setSelected(saved); setForm({ ...blank, ...saved }); setNotice('Đã lưu bài giảng')
    })
  }
  const refreshDetail = async () => { const data = await libraryRequest('/' + selected.id); setSelected(data) }
  const upload = e => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    if (file.size > 100 * 1024 * 1024) { setActionError('Tệp vượt quá 100 MB'); return }
    act(async () => {
      const body = new FormData(); body.append('file', file)
      await libraryRequest('/' + selected.id + '/files', { method: 'POST', body })
      await refreshDetail(); setNotice('Đã tải tệp lên')
    })
  }
  const assetAction = async (asset, view = false) => {
    setBusy(true); setActionError('')
    try {
      const blob = await libraryRequest('/' + selected.id + '/assets/' + asset.id + '/file', { file: true })
      const url = URL.createObjectURL(blob)
      if (view) {
        if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
        previewUrl.current = url; setPreview({ url, name: asset.name, kind: asset.kind })
      } else {
        const a = document.createElement('a'); a.href = url; a.download = asset.name; a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch(e) { setActionError(e.message) } finally { setBusy(false) }
  }
  return <section className="lesson-library">
    <header className="ll-heading"><div><p className="ll-eyebrow">HỌC LIỆU DÙNG CHUNG</p><h1>Thư viện bài giảng</h1><p>{canManage ? 'Quản lý nội dung, xuất bản và cấp quyền theo lớp.' : 'Bài giảng và tài liệu được chia sẻ cho lớp của bạn.'}</p></div>
      {canManage && <button className="ll-primary" disabled={busy} onClick={() => { close(); setForm({ ...blank, classIds: [], audiences: ['TEACHER', 'STUDENT'] }); setNotice('') }}>+ Thêm bài giảng</button>}</header>
    <form className="ll-filters" onSubmit={e => { e.preventDefault(); setQuery({ ...filters, page: 1 }) }}>
      <label>Tìm kiếm<input value={filters.search} placeholder="Tên bài giảng, chủ đề…" onChange={e => setFilters({ ...filters, search: e.target.value })}/></label>
      <label>Môn học<input value={filters.subject} placeholder="Tất cả môn học" onChange={e => setFilters({ ...filters, subject: e.target.value })}/></label>
      <label>Khối lớp<input value={filters.grade} placeholder="Tất cả khối" onChange={e => setFilters({ ...filters, grade: e.target.value })}/></label>
      {canManage && <label>Trạng thái<select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}><option value="">Tất cả</option>{Object.entries(statuses).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>}
      <button className="ll-primary">Tìm kiếm</button>
    </form>
    {notice && <p role="status" className="ll-notice">{notice}</p>}
    {loading ? <p role="status" className="ll-empty">Đang tải thư viện…</p> : error ? <div role="alert" className="ll-error">{error} <button onClick={() => setRevision(v => v + 1)}>Thử lại</button></div> : <>
      <p className="ll-count">{total} bài giảng</p>
      {!items.length ? <div className="ll-empty"><h2>Chưa có bài giảng</h2><p>{canManage ? 'Thêm bài giảng đầu tiên hoặc thay đổi bộ lọc.' : 'Nội dung sẽ xuất hiện khi quản trị xuất bản và cấp quyền cho lớp của bạn.'}</p></div> :
        <div className="ll-grid">{items.map(item => <button disabled={busy} className="ll-card" key={item.id} onClick={() => open(item)}>
          <div className="ll-cover"><span aria-hidden="true">▤</span><span>{item.subject || 'Bài giảng'}</span></div>
          <div className="ll-card-body"><span className={'ll-badge ll-' + item.status}>{statuses[item.status]}</span><h2>{item.title}</h2><p>{item.description || 'Chưa có mô tả'}</p><div className="ll-tags">{[item.grade, item.topic].filter(Boolean).map((v,i) => <span key={i}>{v}</span>)}</div><small>{item.assets?.length || 0} tệp / liên kết · Xem bài giảng →</small></div>
        </button>)}</div>}
      {total > 12 && <div className="ll-pages"><button disabled={query.page <= 1} onClick={() => setQuery({ ...query, page: query.page - 1 })}>Trang trước</button><span>Trang {query.page} / {Math.max(1, Math.ceil(total / 12))}</span><button disabled={query.page * 12 >= total} onClick={() => setQuery({ ...query, page: query.page + 1 })}>Trang sau</button></div>}
    </>}
    {form && <div className="ll-overlay"><section className="ll-dialog" role="dialog" aria-modal="true" aria-label={canManage ? 'Quản lý bài giảng' : 'Chi tiết bài giảng'}>
      <header><h2>{selected ? selected.title : 'Thêm bài giảng'}</h2><button aria-label="Đóng" disabled={busy} onClick={close}>✕</button></header>
      {notice && <p className="ll-notice" role="status">{notice}</p>}
      {actionError && <p className="ll-error" role="alert">{actionError}</p>}
      {canManage ? <form onSubmit={save} className="ll-edit">
        <label>Tên bài giảng *<input required maxLength={300} name="title" value={form.title} onChange={change}/></label>
        <label>Mô tả<textarea name="description" maxLength={20000} rows={3} value={form.description} onChange={change}/></label>
        <div className="ll-columns">{[['subject','Môn học'],['grade','Khối lớp'],['topic','Chủ đề']].map(([key,label]) => <label key={key}>{label}<input name={key} maxLength={key === 'grade' ? 100 : 200} value={form[key]} onChange={change}/></label>)}</div>
        <label>Trạng thái<select name="status" value={form.status} onChange={change}>{Object.entries(statuses).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <fieldset><legend>Đối tượng được xem</legend>{[['TEACHER','Giáo viên'],['STUDENT','Học sinh']].map(([value,label]) => <label className="ll-check" key={value}><input type="checkbox" checked={form.audiences.includes(value)} onChange={() => setForm({ ...form, audiences: toggle(form.audiences, value) })}/>{label}</label>)}</fieldset>
        <fieldset><legend>Lớp được cấp quyền</legend><div className="ll-class-list">{options.classes.length ? options.classes.map(c => <label className="ll-check" key={c.id}><input type="checkbox" checked={form.classIds.includes(c.id)} onChange={() => setForm({ ...form, classIds: toggle(form.classIds, c.id) })}/>{c.name}</label>) : <p>Chưa có lớp trong chi nhánh.</p>}</div></fieldset>
        <p className="ll-hint">Chỉ bài giảng đã xuất bản mới hiển thị cho đối tượng và lớp được chọn.</p>
        <button className="ll-primary" disabled={busy}>{busy ? 'Đang xử lý…' : selected ? 'Lưu thay đổi' : 'Tạo bài giảng'}</button>
      </form> : <div className="ll-detail"><p>{selected.description}</p><div className="ll-tags">{[selected.subject,selected.grade,selected.topic].filter(Boolean).map((v,i) => <span key={i}>{v}</span>)}</div></div>}
      <section className="ll-assets"><h3>Tệp và liên kết</h3>
        {!selected ? <p className="ll-hint">Tạo bài giảng trước để thêm tệp và liên kết.</p> : <>
          {!selected.assets?.length && <p className="ll-hint">Chưa có tệp hoặc liên kết.</p>}
          {selected.assets?.map(asset => <div className="ll-asset" key={asset.id}><div><strong>{asset.name}</strong><small>{asset.kind === 'link' ? 'Liên kết' : asset.kind.toUpperCase() + ' · ' + (asset.sizeBytes / 1024 / 1024).toFixed(1) + ' MB'}</small></div><div className="ll-asset-actions">
            {asset.kind === 'link' ? <a href={/^https?:\/\//i.test(asset.url) ? asset.url : '#'} target="_blank" rel="noopener noreferrer">Mở liên kết ↗</a> : <>
              {['pdf','video'].includes(asset.kind) && <button disabled={busy} onClick={() => assetAction(asset,true)}>Xem</button>}<button disabled={busy} onClick={() => assetAction(asset)}>Tải về</button></>}
            {canManage && <button disabled={busy} className="ll-danger" onClick={() => setConfirmDelete({ assetId: asset.id, name: asset.name })}>Gỡ</button>}
          </div></div>)}
          {canManage && <div className="ll-add-assets"><label className="ll-upload">+ Tải tệp lên<input type="file" disabled={busy} accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.webm,.mov" onChange={upload}/></label><p className="ll-hint">PDF, Word, PowerPoint, MP4, WebM, MOV · Tối đa 100 MB/tệp</p>
            <form className="ll-link-form" onSubmit={e => { e.preventDefault(); act(async () => { await libraryRequest('/' + selected.id + '/links', { method: 'POST', body: link }); setLink({ name: '', url: '' }); await refreshDetail() }) }}>
              <label>Tên liên kết<input required maxLength={300} value={link.name} onChange={e => setLink({ ...link, name: e.target.value })}/></label><label>URL<input required type="url" placeholder="https://…" maxLength={4000} value={link.url} onChange={e => setLink({ ...link, url: e.target.value })}/></label><button disabled={busy}>Thêm liên kết</button>
            </form></div>}
        </>}
      </section>
      {canManage && selected && <footer><button className="ll-danger" disabled={busy} onClick={() => setConfirmDelete({ name: selected.title })}>Xóa bài giảng</button></footer>}
      {confirmDelete && <div className="ll-confirm" role="alertdialog" aria-label="Xác nhận xóa"><p>{confirmDelete.assetId ? 'Gỡ tệp / liên kết' : 'Xóa bài giảng'} “{confirmDelete.name}”?</p><button disabled={busy} onClick={() => setConfirmDelete(null)}>Hủy</button><button disabled={busy} className="ll-danger" onClick={() => act(async () => {
        if (confirmDelete.assetId) { await libraryRequest('/' + selected.id + '/assets/' + confirmDelete.assetId, { method: 'DELETE' }); await refreshDetail(); setConfirmDelete(null) }
        else { await libraryRequest('/' + selected.id, { method: 'DELETE' }); close() }
      })}>Xác nhận xóa</button></div>}
    </section></div>}
    {preview && <div className="ll-overlay ll-preview"><section className="ll-dialog" role="dialog" aria-modal="true" aria-label={preview.name}><header><h2>{preview.name}</h2><button aria-label="Đóng xem trước" onClick={() => { setPreview(null); URL.revokeObjectURL(previewUrl.current); previewUrl.current = null }}>✕</button></header>{preview.kind === 'video' ? <video controls src={preview.url}/> : <iframe title={preview.name} src={preview.url}/>}</section></div>}
  </section>
}
