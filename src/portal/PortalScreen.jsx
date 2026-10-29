import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usePortal } from "./portalStore.js";

const titles = {
  dashboard: "Tổng quan học tập",
  classes: "Lớp học của tôi",
  courses: "Khóa học",
  schedules: "Lịch giảng dạy",
  homework: "Bài tập",
  grading: "Chấm điểm",
  quiz: "Quiz & đề thi",
  exam: "Ngân hàng đề thi",
  lesson: "Bài học",
  material: "Tài liệu",
  progress: "Tiến độ & kết quả",
  certificates: "Chứng chỉ",
  achievements: "Thành tích",
  profile: "Hồ sơ cá nhân",
  discussion: "Thảo luận",
  report: "Báo cáo sau buổi học",
  feedback: "Nhận xét",
};
const localDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const date = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "—");
const Empty = ({ children = "Chưa có dữ liệu." }) => (
  <p className="portal-empty">{children}</p>
);
const Card = ({ children }) => (
  <article className="portal-card">{children}</article>
);
function FileButton({ id }) {
  const { download, data } = usePortal();
  return id ? (
    <button type="button" onClick={() => download(id)}>
      Tải {data.files?.find((f) => f.id === id)?.fileName || "tệp"}
    </button>
  ) : null;
}

export function PortalScreen({ mode = "dashboard" }) {
  const { data, busy, reload } = usePortal();
  const [classId, setClassId] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(
    data.profile.userType === "TEACHER" ? "students" : "lesson",
  );
  const teacher = data.profile.userType === "TEACHER";
  const className = (id) => data.classes.find((c) => c.id === id)?.name || "—";
  const studentName = (id) =>
    data.students.find((s) => s.id === id)?.name || "—";
  const filtered = (rows) =>
    rows.filter(
      (r) =>
        (!classId || r.classId === classId) &&
        (!search ||
          JSON.stringify(r)
            .toLocaleLowerCase()
            .includes(search.toLocaleLowerCase())),
    );
  const records = (kind) =>
    filtered(
      data.records.filter(
        (r) => r.kind === kind || (kind === "quiz" && r.kind === "exam"),
      ),
    );
  const completed = data.records.filter(
    (r) => r.kind === "progress" && r.content.percent === 100,
  ).length;
  const attempts = data.records.filter(
    (r) => r.kind === "attempt" && r.content.submittedAt,
  );
  const routes = teacher
    ? {
        classes: "/lop-hoc-cua-toi",
        homework: "/ngan-hang-bai-tap",
        quiz: "/ngan-hang-de-thi",
        progress: "/ket-qua-hoc-tap",
      }
    : {
        courses: "/courses",
        lesson: "/lessons",
        homework: "/homework",
        quiz: "/quiz",
        material: "/materials",
        progress: "/progress",
        certificates: "/certificates",
        achievements: "/achievements",
      };
  let content;
  if (mode === "profile")
    content = (
      <Card>
        <h2>{data.profile.name}</h2>
        <p>{data.profile.email}</p>
        <p>{data.profile.phone || "Chưa có số điện thoại"}</p>
        <p>{teacher ? "Giáo viên" : "Học sinh"}</p>
      </Card>
    );
  else if (mode === "dashboard")
    content = (
      <>
        <div className="portal-grid">
          {[
            [data.classes.length, "Lớp học"],
            [data.homework.length, "Bài tập"],
            [
              teacher
                ? data.submissions.filter((s) => s.score == null).length
                : completed,
              teacher ? "Bài chưa chấm" : "Bài học hoàn thành",
            ],
            [
              data.notifications.filter((n) => !n.readAt).length,
              "Thông báo chưa đọc",
            ],
          ].map(([n, title]) => (
            <Card key={title}>
              <span className="portal-stat">{n}</span>
              <p>{title}</p>
            </Card>
          ))}
        </div>
        <div className="portal-grid">
          {Object.entries(routes).map(([key, path]) => (
            <Card key={key}>
              <Link to={path}>{titles[key]}</Link>
            </Card>
          ))}
        </div>
        <h2>Lịch học sắp tới</h2>
        <ScheduleList
          rows={data.schedules
            .filter(
              (s) =>
                Date.parse(s.endAt) > Date.now() && s.status !== "cancelled",
            )
            .slice(0, 5)}
          className={className}
          teacher={false}
        />
        <Notifications />
      </>
    );
  else if (["classes", "courses"].includes(mode))
    content = (
      <>
        <div className="portal-grid">
          {data.classes
            .filter(
              (c) =>
                (!classId || c.id === classId) &&
                (!search ||
                  c.name.toLowerCase().includes(search.toLowerCase())),
            )
            .map((c) => {
              const course = data.courses.find((x) => x.id === c.courseId);
              return (
                <Card key={c.id}>
                  <h2>{c.name}</h2>
                  <p>
                    {course?.name} · {course?.level}
                  </p>
                  <p className="portal-muted">
                    {c.code} · {c.status}
                  </p>
                  <p>
                    {date(c.startDate)} — {date(c.endDate)}
                  </p>
                  <p>{course?.orientation || c.note}</p>
                  <button onClick={() => setClassId(c.id)}>Xem lớp</button>
                </Card>
              );
            })}
        </div>
        {!data.classes.length && (
          <Empty>Bạn chưa được phân công hoặc đăng ký lớp học.</Empty>
        )}
        {classId && (
          <>
            <div className="portal-actions">
              {(teacher
                ? [
                    "students",
                    "attendance",
                    "homework",
                    "lesson",
                    "quiz",
                    "material",
                    "discussion",
                    "report",
                    "feedback",
                    "progress",
                  ]
                : [
                    "lesson",
                    "homework",
                    "quiz",
                    "material",
                    "discussion",
                    "progress",
                  ]
              ).map((key) => (
                <button key={key} onClick={() => setTab(key)}>
                  {{ students: "Học sinh", attendance: "Điểm danh" }[key] ||
                    titles[key]}
                </button>
              ))}
            </div>
            {tab === "students" ? (
              <Roster classId={classId} />
            ) : tab === "attendance" ? (
              <ScheduleList
                rows={data.schedules.filter((s) => s.classId === classId)}
                className={className}
                teacher
              />
            ) : tab === "homework" ? (
              <Homework
                classId={classId}
                rows={filtered(data.homework)}
                teacher={teacher}
              />
            ) : tab === "progress" ? (
              <Results classId={classId} />
            ) : (
              <Records
                kind={tab}
                classId={classId}
                rows={records(tab)}
                teacher={teacher}
              />
            )}
          </>
        )}
      </>
    );
  else if (mode === "schedules")
    content = (
      <ScheduleList
        rows={filtered(data.schedules)}
        className={className}
        teacher={teacher}
      />
    );
  else if (mode === "homework")
    content = (
      <Homework
        classId={classId}
        rows={filtered(data.homework)}
        teacher={teacher}
      />
    );
  else if (mode === "grading")
    content = (
      <Grading
        rows={data.submissions.filter((s) =>
          filtered(data.homework).some((h) => h.id === s.homeworkId),
        )}
        studentName={studentName}
      />
    );
  else if (mode === "progress") content = <Results classId={classId} />;
  else if (mode === "certificates")
    content = (
      <div className="portal-grid">
        {data.certificates.map((c) => (
          <Card key={c.id}>
            <h2>{c.title}</h2>
            <p>
              {c.issuer} · {c.status}
            </p>
            <p>Ngày cấp: {date(c.issuedAt)}</p>
            <FileButton id={c.fileId} />
          </Card>
        ))}
        {!data.certificates.length && <Empty />}
      </div>
    );
  else if (mode === "achievements")
    content = (
      <>
        <div className="portal-grid">
          <Card>
            <h2>Bài học hoàn thành</h2>
            <span className="portal-stat">{completed}</span>
          </Card>
          <Card>
            <h2>Lượt quiz đã nộp</h2>
            <span className="portal-stat">{attempts.length}</span>
          </Card>
          <Card>
            <h2>Điểm quiz trung bình /100</h2>
            <span className="portal-stat">
              {attempts.length
                ? Math.round(
                    attempts.reduce((n, a) => n + a.content.score, 0) /
                      attempts.length,
                  )
                : "—"}
            </span>
          </Card>
        </div>
        <p className="portal-muted">
          Thành tích được tính từ bài học và lượt làm bài đã lưu.
        </p>
      </>
    );
  else
    content = (
      <Records
        kind={mode}
        classId={classId}
        rows={records(mode)}
        teacher={teacher}
      />
    );
  return (
    <section className="portal">
      <header className="portal-toolbar">
        <h1>{titles[mode]}</h1>
        <button disabled={busy} onClick={() => reload().catch(() => {})}>
          Làm mới
        </button>
      </header>
      {!["profile", "achievements"].includes(mode) && (
        <div className="portal-toolbar">
          <select
            aria-label="Lọc lớp học"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            <option value="">Tất cả lớp</option>
            {data.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            aria-label="Tìm kiếm"
            placeholder="Tìm kiếm…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}
      {content}
    </section>
  );
}

function Notifications() {
  const { data, act, busy } = usePortal();
  return (
    <>
      <h2>Thông báo</h2>
      {data.notifications.length ? (
        data.notifications.map((n) => (
          <Card key={n.id}>
            <h2>{n.title}</h2>
            <p>{n.content}</p>
            <span className="portal-muted">{date(n.createdAt)}</span>
            {!n.readAt && (
              <button
                disabled={busy}
                onClick={() =>
                  act(`/notifications/${n.id}/read`, { method: "PATCH" })
                }
              >
                Đánh dấu đã đọc
              </button>
            )}
          </Card>
        ))
      ) : (
        <Empty>Chưa có thông báo.</Empty>
      )}
    </>
  );
}
function Roster({ classId }) {
  const { data } = usePortal();
  const students = data.students.filter((s) =>
    data.enrollments.some((e) => e.studentId === s.id && e.classId === classId),
  );
  return (
    <Card>
      <h2>Danh sách học sinh</h2>
      {students.length ? (
        <div className="portal-table">
          <table>
            <thead>
              <tr>
                <th>Mã học sinh</th>
                <th>Họ tên</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>{s.code}</td>
                  <td>{s.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty />
      )}
    </Card>
  );
}
function ScheduleList({ rows, className, teacher }) {
  const { data, act, busy } = usePortal();
  const [selected, setSelected] = useState("");
  const schedule = rows.find((r) => r.id === selected);
  const students = schedule
    ? data.students.filter((s) =>
        data.enrollments.some(
          (e) => e.classId === schedule.classId && e.studentId === s.id,
        ),
      )
    : [];
  return (
    <>
      <div className="portal-grid">
        {rows.map((s) => (
          <Card key={s.id}>
            <h2>{className(s.classId)}</h2>
            <p>
              {date(s.startAt)} — {date(s.endAt)}
            </p>
            <p>
              {s.teacher} · {s.room || "Chưa có phòng"} · {s.status}
            </p>
            <p>{s.lessonNote}</p>
            {teacher && (
              <button onClick={() => setSelected(s.id)}>Điểm danh</button>
            )}
          </Card>
        ))}
        {!rows.length && <Empty>Chưa có lịch học.</Empty>}
      </div>
      {schedule && (
        <Card>
          <h2>Điểm danh · {date(schedule.startAt)}</h2>
          {students.map((s) => (
            <label key={s.id}>
              {s.name}
              <select
                aria-label={`Điểm danh ${s.name}`}
                disabled={busy}
                value={
                  data.records.find(
                    (r) =>
                      r.kind === "attendance" &&
                      r.parentId === schedule.id &&
                      r.ownerId === s.id,
                  )?.content.status || ""
                }
                onChange={(e) =>
                  act(`/schedules/${schedule.id}/attendance`, {
                    method: "PATCH",
                    body: { studentId: s.id, status: e.target.value },
                  })
                }
              >
                <option value="" disabled>
                  Chưa điểm danh
                </option>
                {Object.entries({
                  present: "Có mặt",
                  late: "Muộn",
                  excused: "Nghỉ phép",
                  absent: "Vắng",
                }).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {!students.length && <Empty />}
        </Card>
      )}
    </>
  );
}
function ClassField({ value, onChange }) {
  const { data } = usePortal();
  return (
    <label>
      Lớp học
      <select required value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Chọn lớp</option>
        {data.classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
function Homework({ classId, rows, teacher }) {
  const { data, act, busy } = usePortal();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: "",
    note: "",
    deadline: "",
    classId: "",
  });
  async function save(e) {
    e.preventDefault();
    const saved = await act(
      editing?.id ? `/homework/${editing.id}` : "/homework",
      {
        method: editing?.id ? "PATCH" : "POST",
        body: {
          ...form,
          classId: form.classId || classId,
          deadline: new Date(form.deadline).toISOString(),
        },
      },
    );
    if (saved) setEditing(null);
  }
  return (
    <>
      {teacher && (
        <button
          disabled={!data.classes.length}
          onClick={() => {
            setEditing({});
            setForm({ title: "", note: "", deadline: "", classId });
          }}
        >
          Giao bài tập
        </button>
      )}
      {editing && (
        <Card>
          <form onSubmit={save}>
            <ClassField
              value={form.classId}
              onChange={(v) => setForm({ ...form, classId: v })}
            />
            <label>
              Tiêu đề
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Hạn nộp
              <input
                required
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </label>
            <label>
              Nội dung
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </label>
            <div className="portal-actions">
              <button className="primary" disabled={busy}>
                Lưu
              </button>
              <button type="button" onClick={() => setEditing(null)}>
                Hủy
              </button>
            </div>
          </form>
        </Card>
      )}
      <div className="portal-grid">
        {rows.map((h) => (
          <Card key={h.id}>
            <h2>{h.title}</h2>
            <p className="portal-muted">
              {data.classes.find((c) => c.id === h.classId)?.name} · Hạn nộp{" "}
              {date(h.deadline)}
            </p>
            <p>{h.note}</p>
            {teacher ? (
              <>
                <p>
                  {data.submissions.filter((s) => s.homeworkId === h.id).length}{" "}
                  bài nộp
                </p>
                <button
                  onClick={() => {
                    setEditing(h);
                    const d = new Date(h.deadline);
                    setForm({
                      title: h.title,
                      note: h.note || "",
                      classId: h.classId,
                      deadline: new Date(d - d.getTimezoneOffset() * 60000)
                        .toISOString()
                        .slice(0, 16),
                    });
                  }}
                >
                  Chỉnh sửa
                </button>
              </>
            ) : (
              <Submission homework={h} />
            )}
          </Card>
        ))}
        {!rows.length && <Empty>Chưa có bài tập.</Empty>}
      </div>
    </>
  );
}
function Submission({ homework }) {
  const { data, act, busy } = usePortal();
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const submission = data.submissions.find((s) => s.homeworkId === homework.id);
  const meta = data.records.find(
    (r) => r.kind === "submission-files" && r.parentId === submission?.id,
  );
  async function send(e) {
    e.preventDefault();
    setSending(true);
    try {
      const ids = [...(meta?.content.fileIds || [])];
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        const saved = await act("/files", { method: "POST", body });
        if (!saved) return;
        ids.push(saved.id);
      }
      const saved = await act(`/homework/${homework.id}/submissions`, {
        method: "POST",
        body: { fileIds: ids, note: text },
      });
      if (saved) {
        setText("");
        setFiles([]);
      }
    } finally {
      setSending(false);
    }
  }
  return (
    <>
      {submission && (
        <div>
          <p>Đã nộp: {date(submission.submittedAt)}</p>
          <p>{meta?.content.text}</p>
          {meta?.content.fileIds?.map((id) => (
            <FileButton key={id} id={id} />
          ))}
          {meta?.content.returned ? (
            <>
              <p>Điểm: {submission.score}/100</p>
              <p>Nhận xét: {submission.note}</p>
            </>
          ) : (
            <p>Đang chờ giáo viên chấm/trả bài.</p>
          )}
        </div>
      )}
      {!meta?.content.returned && homework.status === "assigned" && (
        <form onSubmit={send}>
          <label>
            Bài làm
            <textarea value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <label>
            Tệp đính kèm (tối đa 10 tệp, 50 MB/tệp)
            <input
              type="file"
              multiple
              onChange={(e) =>
                setFiles(Array.from(e.target.files).slice(0, 10))
              }
            />
          </label>
          <button
            className="primary"
            disabled={busy || sending || (!text.trim() && !files.length)}
          >
            {sending
              ? "Đang gửi…"
              : submission
                ? "Nộp lại bài"
                : "Gửi bài cho giáo viên"}
          </button>
        </form>
      )}
    </>
  );
}
function Grading({ rows, studentName }) {
  const { data } = usePortal();
  return (
    <div className="portal-grid">
      {rows.map((s) => (
        <Grade
          key={s.id}
          submission={s}
          title={`${studentName(s.studentId)} · ${data.homework.find((h) => h.id === s.homeworkId)?.title || ""}`}
        />
      ))}
      {!rows.length && <Empty>Chưa có bài nộp.</Empty>}
    </div>
  );
}
function Grade({ submission: s, title }) {
  const { data, act, busy } = usePortal();
  const [score, setScore] = useState(s.score ?? "");
  const [note, setNote] = useState(s.markedBy ? s.note || "" : "");
  const meta = data.records.find(
    (r) => r.kind === "submission-files" && r.parentId === s.id,
  );
  return (
    <Card>
      <h2>{title}</h2>
      <p>Nộp lúc {date(s.submittedAt)}</p>
      <p>{meta?.content.text || (!s.markedBy ? s.note : "")}</p>
      {meta?.content.fileIds?.map((id) => (
        <FileButton key={id} id={id} />
      ))}
      <label>
        Điểm /100
        <input
          type="number"
          min="0"
          max="100"
          step="1"
          value={score}
          onChange={(e) => setScore(e.target.value)}
        />
      </label>
      <label>
        Nhận xét
        <textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <p>{meta?.content.returned ? "Đã trả bài" : "Chưa trả bài"}</p>
      <div className="portal-actions">
        {[false, true].map((returned) => (
          <button
            key={String(returned)}
            disabled={
              busy || score === "" || Number(score) < 0 || Number(score) > 100
            }
            onClick={() =>
              act(`/submissions/${s.id}/grade`, {
                method: "PATCH",
                body: { score: Number(score), note, returned },
              })
            }
          >
            {returned ? "Lưu và trả bài" : "Lưu nháp"}
          </button>
        ))}
      </div>
    </Card>
  );
}

function Records({ kind, classId, rows, teacher }) {
  const { data, act, busy } = usePortal();
  const [editing, setEditing] = useState(null);
  const [taking, setTaking] = useState(null);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const canCreate = teacher || kind === "discussion";
  const quiz = ["quiz", "exam"].includes(kind);
  function edit(r = null) {
    setEditing(r || {});
    setFile(null);
    setQuestions(
      r?.content.questions || [
        { prompt: "", options: ["", "", "", ""], answer: 0 },
      ],
    );
    setForm({
      classId: r?.classId || classId,
      title: r?.content.title || "",
      body: r?.content.body || "",
      url: r?.content.url || "",
      fileId: r?.content.fileId,
      duration: r?.content.duration || 15,
      opensAt: localDateTime(r?.content.opensAt),
      closesAt: localDateTime(r?.content.closesAt),
      published: r?.content.published !== false,
      ownerId: r?.ownerId || "",
      parentId: r?.parentId || "",
    });
  }
  async function save(e) {
    e.preventDefault();
    let fileId = form.fileId;
    if (file) {
      const body = new FormData();
      body.append("file", file);
      const saved = await act("/files", { method: "POST", body });
      if (!saved) return;
      fileId = saved.id;
    }
    const body = {
      classId: form.classId,
      kind: editing.kind || kind,
      ...(form.ownerId ? { ownerId: form.ownerId } : {}),
      ...(form.parentId ? { parentId: form.parentId } : {}),
      content: {
        title: form.title,
        body: form.body,
        published: form.published,
        ...(["lesson", "material"].includes(kind)
          ? { url: form.url, fileId }
          : {}),
        ...(quiz
          ? {
              duration: Number(form.duration),
              questions,
              opensAt: form.opensAt
                ? new Date(form.opensAt).toISOString()
                : null,
              closesAt: form.closesAt
                ? new Date(form.closesAt).toISOString()
                : null,
            }
          : {}),
      },
    };
    const saved = await act(
      editing.id ? `/records/${editing.id}` : "/records",
      { method: editing.id ? "PATCH" : "POST", body },
    );
    if (saved) setEditing(null);
  }
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  return (
    <>
      {canCreate && (
        <button disabled={!data.classes.length} onClick={() => edit()}>
          Tạo {titles[kind]?.toLowerCase()}
        </button>
      )}
      {editing && (
        <Card>
          <form onSubmit={save}>
            <ClassField
              value={form.classId}
              onChange={(v) => set("classId", v)}
            />
            <label>
              Tiêu đề
              <input
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </label>
            <label>
              Nội dung
              <textarea
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
              />
            </label>
            {kind === "feedback" && (
              <label>
                Học sinh
                <select
                  required
                  value={form.ownerId}
                  onChange={(e) => set("ownerId", e.target.value)}
                >
                  <option value="">Chọn học sinh</option>
                  {data.students
                    .filter((s) =>
                      data.enrollments.some(
                        (e) =>
                          e.classId === form.classId && e.studentId === s.id,
                      ),
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {kind === "report" && (
              <label>
                Buổi học
                <select
                  required
                  value={form.parentId}
                  onChange={(e) => set("parentId", e.target.value)}
                >
                  <option value="">Chọn buổi học</option>
                  {data.schedules
                    .filter((s) => s.classId === form.classId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {date(s.startAt)}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {["lesson", "material"].includes(kind) && (
              <>
                <label>
                  URL tài liệu/video
                  <input
                    type="url"
                    value={form.url}
                    onChange={(e) => set("url", e.target.value)}
                  />
                </label>
                <label>
                  Hoặc tải tệp
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                </label>
              </>
            )}
            {quiz && (
              <>
                <label>
                  Thời lượng (phút)
                  <input
                    required
                    min="1"
                    max="180"
                    type="number"
                    value={form.duration}
                    onChange={(e) => set("duration", e.target.value)}
                  />
                </label>
                {questions.map((q, i) => (
                  <Card key={i}>
                    <label>
                      Câu {i + 1}
                      <input
                        required
                        value={q.prompt}
                        onChange={(e) =>
                          setQuestions(
                            questions.map((v, n) =>
                              n === i ? { ...v, prompt: e.target.value } : v,
                            ),
                          )
                        }
                      />
                    </label>
                    {q.options.map((o, j) => (
                      <label key={j}>
                        Đáp án {String.fromCharCode(65 + j)}
                        <input
                          required
                          value={o}
                          onChange={(e) =>
                            setQuestions(
                              questions.map((v, n) =>
                                n === i
                                  ? {
                                      ...v,
                                      options: v.options.map((a, k) =>
                                        k === j ? e.target.value : a,
                                      ),
                                    }
                                  : v,
                              ),
                            )
                          }
                        />
                      </label>
                    ))}
                    <label>
                      Đáp án đúng
                      <select
                        value={q.answer}
                        onChange={(e) =>
                          setQuestions(
                            questions.map((v, n) =>
                              n === i
                                ? { ...v, answer: Number(e.target.value) }
                                : v,
                            ),
                          )
                        }
                      >
                        {q.options.map((_, j) => (
                          <option key={j} value={j}>
                            {String.fromCharCode(65 + j)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={questions.length < 2}
                      onClick={() =>
                        setQuestions(questions.filter((_, n) => n !== i))
                      }
                    >
                      Xóa câu hỏi
                    </button>
                  </Card>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setQuestions([
                      ...questions,
                      { prompt: "", options: ["", "", "", ""], answer: 0 },
                    ])
                  }
                >
                  Thêm câu hỏi
                </button>
              </>
            )}
            {teacher && (
              <label className="portal-option">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => set("published", e.target.checked)}
                />
                Hiển thị cho học sinh
              </label>
            )}
            <div className="portal-actions">
              <button disabled={busy} className="primary">
                Lưu
              </button>
              <button type="button" onClick={() => setEditing(null)}>
                Hủy
              </button>
            </div>
          </form>
        </Card>
      )}
      {taking && (
        <QuizTaking
          key={taking.attempt.id}
          quiz={taking.quiz}
          initial={taking.attempt}
          onClose={() => setTaking(null)}
        />
      )}
      <div className="portal-grid">
        {rows.map((r) => (
          <Card key={r.id}>
            <h2>{r.content.title}</h2>
            <p className="portal-muted">
              {data.classes.find((c) => c.id === r.classId)?.name} ·{" "}
              {date(r.createdAt)}
              {r.ownerId &&
                ` · ${data.students.find((s) => s.id === r.ownerId)?.name || ""}`}
            </p>
            <p>{r.content.body}</p>
            {r.content.url && (
              <a target="_blank" rel="noreferrer" href={r.content.url}>
                Mở nội dung
              </a>
            )}
            <FileButton id={r.content.fileId} />
            {kind === "lesson" && !teacher && (
              <>
                <progress
                  max="100"
                  value={
                    data.records.find(
                      (p) => p.kind === "progress" && p.parentId === r.id,
                    )?.content.percent || 0
                  }
                />
                <button
                  disabled={busy}
                  onClick={() =>
                    act(`/lessons/${r.id}/progress`, {
                      method: "PATCH",
                      body: { percent: 100 },
                    })
                  }
                >
                  Đánh dấu đã học xong
                </button>
              </>
            )}
            {quiz && (
              <>
                <p>
                  {r.content.questions?.length || 0} câu · {r.content.duration}{" "}
                  phút
                </p>
                {!teacher && (
                  <button
                    disabled={busy}
                    onClick={async () => {
                      const attempt = await act(`/quizzes/${r.id}/attempts`, {
                        method: "POST",
                      });
                      if (attempt) setTaking({ quiz: r, attempt });
                    }}
                  >
                    Bắt đầu / tiếp tục
                  </button>
                )}
                {data.records
                  .filter(
                    (a) =>
                      a.kind === "attempt" &&
                      a.parentId === r.id &&
                      a.content.submittedAt,
                  )
                  .map((a) => (
                    <p key={a.id}>
                      {teacher
                        ? data.students.find((s) => s.id === a.ownerId)?.name
                        : "Kết quả"}
                      : {a.content.score}/100 · {date(a.content.submittedAt)}
                    </p>
                  ))}
              </>
            )}
            {canCreate && (teacher || r.createdBy === data.profile.userId) && (
              <div className="portal-actions">
                <button onClick={() => edit(r)}>Chỉnh sửa</button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("Xóa nội dung này?"))
                      act(`/records/${r.id}`, { method: "DELETE" });
                  }}
                >
                  Xóa
                </button>
              </div>
            )}
          </Card>
        ))}
        {!rows.length && <Empty />}
      </div>
      {kind === "material" &&
        data.documents
          .filter((d) =>
            data.classDocuments.some(
              (c) =>
                c.documentId === d.id && (!classId || c.classId === classId),
            ),
          )
          .map((d) => (
            <Card key={d.id}>
              <h2>{d.title}</h2>
              <FileButton id={d.fileId} />
            </Card>
          ))}
    </>
  );
}
function QuizTaking({ quiz, initial, onClose }) {
  const { act, busy } = usePortal();
  const [attempt, setAttempt] = useState(initial);
  const [answers, setAnswers] = useState(initial.content.answers || []);
  const clockOffset = useRef(
    (Date.parse(initial.serverNow) || Date.now()) - Date.now(),
  );
  const [now, setNow] = useState(Date.now() + clockOffset.current);
  const autoSubmitted = useRef(false);
  useEffect(() => {
    const timer = setInterval(
      () => setNow(Date.now() + clockOffset.current),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  const remaining = Math.max(
    0,
    Math.ceil((Date.parse(attempt.content.expiresAt) - now) / 1000),
  );
  const submitted = !!attempt.content.submittedAt;
  const save = useCallback(
    async (submit, next = answers) => {
      const result = await act(
        `/attempts/${attempt.id}/${submit ? "submit" : "answers"}`,
        {
          method: submit ? "POST" : "PATCH",
          body: {
            answers: Array.from(
              { length: quiz.content.questions.length },
              (_, i) => next[i] ?? -1,
            ),
          },
        },
      );
      if (result) setAttempt(result);
    },
    [act, answers, attempt.id, quiz.content.questions.length],
  );
  useEffect(() => {
    if (!remaining && !submitted && !busy && !autoSubmitted.current) {
      autoSubmitted.current = true;
      save(true);
    }
  }, [remaining, submitted, busy, save]);
  return (
    <Card>
      <h2>{quiz.content.title}</h2>
      {submitted ? (
        <>
          <p>Đã nộp · Điểm: {attempt.content.score}/100</p>
          <button onClick={onClose}>Đóng</button>
        </>
      ) : (
        <>
          <p>
            Thời gian còn lại: {Math.floor(remaining / 60)}:
            {String(remaining % 60).padStart(2, "0")}
          </p>
          {quiz.content.questions.map((q, i) => (
            <fieldset key={i}>
              <legend>
                {i + 1}. {q.prompt}
              </legend>
              {q.options.map((option, j) => (
                <label className="portal-option" key={j}>
                  <input
                    disabled={busy || !remaining}
                    type="radio"
                    name={`question-${i}`}
                    checked={answers[i] === j}
                    onChange={() => {
                      const next = [...answers];
                      next[i] = j;
                      setAnswers(next);
                      save(false, next);
                    }}
                  />
                  {option}
                </label>
              ))}
            </fieldset>
          ))}
          <button
            className="primary"
            disabled={busy}
            onClick={() => save(true)}
          >
            Nộp bài
          </button>
        </>
      )}
    </Card>
  );
}
function Results({ classId }) {
  const { data } = usePortal();
  const [editing, setEditing] = useState(null);
  const records = data.records.filter((r) => !classId || r.classId === classId);
  const lessons = records.filter((r) => r.kind === "lesson");
  const students = data.students.filter(
    (s) =>
      !classId ||
      data.enrollments.some(
        (e) => e.classId === classId && e.studentId === s.id,
      ),
  );
  return (
    <>
      {data.profile.userType === "TEACHER" && (
        <button
          disabled={!data.classes.length}
          onClick={() => setEditing({ classId })}
        >
          Thêm điểm số
        </button>
      )}
      {editing && (
        <ScoreEditor
          key={editing.id || "new"}
          initial={editing}
          onClose={() => setEditing(null)}
        />
      )}
      <div className="portal-grid">
        {students.map((s) => {
          const completed = records.filter(
            (r) =>
              r.kind === "progress" &&
              r.ownerId === s.id &&
              r.content.percent === 100,
          ).length;
          const studentLessons = lessons.filter((l) =>
            data.enrollments.some(
              (e) => e.studentId === s.id && e.classId === l.classId,
            ),
          ).length;
          const scores = data.scores.filter(
            (v) => v.studentId === s.id && (!classId || v.classId === classId),
          );
          return (
            <Card key={s.id}>
              <h2>{s.name}</h2>
              <p>
                Bài học hoàn thành: {completed}/{studentLessons}
              </p>
              <progress
                max="100"
                value={studentLessons ? (completed * 100) / studentLessons : 0}
              />
              {scores.map((v) => (
                <div key={v.id}>
                  <p>
                    {v.title}: {v.score}/{v.maxScore}
                  </p>
                  {data.profile.userType === "TEACHER" && (
                    <button onClick={() => setEditing(v)}>Sửa điểm</button>
                  )}
                </div>
              ))}
              {data.submissions
                .filter(
                  (sub) =>
                    sub.studentId === s.id &&
                    sub.score != null &&
                    data.homework.some(
                      (h) =>
                        h.id === sub.homeworkId &&
                        (!classId || h.classId === classId),
                    ),
                )
                .map((sub) => (
                  <p key={sub.id}>
                    {data.homework.find((h) => h.id === sub.homeworkId)?.title}:{" "}
                    {sub.score}/{sub.maxScore} · {sub.note}
                  </p>
                ))}
              {records
                .filter(
                  (r) =>
                    r.ownerId === s.id &&
                    r.kind === "attempt" &&
                    r.content.submittedAt,
                )
                .map((a) => (
                  <p key={a.id}>
                    {records.find((q) => q.id === a.parentId)?.content.title}:{" "}
                    {a.content.score}/100
                  </p>
                ))}
              {records
                .filter((r) => r.ownerId === s.id && r.kind === "feedback")
                .map((r) => (
                  <p key={r.id}>
                    {r.content.title}: {r.content.body}
                  </p>
                ))}
            </Card>
          );
        })}
        {!students.length && <Empty />}
      </div>
    </>
  );
}

function ScoreEditor({ initial, onClose }) {
  const { data, act, busy } = usePortal();
  const [form, setForm] = useState({
    classId: initial.classId || "",
    studentId: initial.studentId || "",
    title: initial.title || "",
    subject: initial.subject || "",
    scoreDate:
      initial.scoreDate?.slice(0, 10) || new Date().toLocaleDateString("en-CA"),
    score: initial.score ?? "",
    maxScore: initial.maxScore ?? 100,
    note: initial.note || "",
  });
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function save(e) {
    e.preventDefault();
    const result = await act(initial.id ? `/scores/${initial.id}` : "/scores", {
      method: initial.id ? "PATCH" : "POST",
      body: {
        ...form,
        score: Number(form.score),
        maxScore: Number(form.maxScore),
        teacherId: data.profile.id,
      },
    });
    if (result) onClose();
  }
  return (
    <Card>
      <form onSubmit={save}>
        <ClassField
          value={form.classId}
          onChange={(v) => {
            set("classId", v);
            set("studentId", "");
          }}
        />
        <label>
          Học sinh
          <select
            required
            value={form.studentId}
            onChange={(e) => set("studentId", e.target.value)}
          >
            <option value="">Chọn học sinh</option>
            {data.students
              .filter((s) =>
                data.enrollments.some(
                  (e) => e.classId === form.classId && e.studentId === s.id,
                ),
              )
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </label>
        {[
          ["title", "Tên bài kiểm tra"],
          ["subject", "Môn / kỹ năng"],
          ["scoreDate", "Ngày kiểm tra"],
          ["score", "Điểm"],
          ["maxScore", "Thang điểm"],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              required
              type={
                key === "scoreDate"
                  ? "date"
                  : ["score", "maxScore"].includes(key)
                    ? "number"
                    : "text"
              }
              step="any"
              min={key === "maxScore" ? "0.01" : "0"}
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
            />
          </label>
        ))}
        <label>
          Nhận xét
          <textarea
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
          />
        </label>
        <div className="portal-actions">
          <button disabled={busy} className="primary">
            Lưu điểm
          </button>
          <button type="button" onClick={onClose}>
            Hủy
          </button>
        </div>
      </form>
    </Card>
  );
}
