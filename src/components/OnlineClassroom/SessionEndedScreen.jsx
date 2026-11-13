export function SessionEndedScreen({ state, onBack }) {
  const labels = { ended: 'Buổi học đã kết thúc', removed: 'Bạn đã được mời ra khỏi lớp', duplicate: 'Lớp học đang mở ở thiết bị khác', disconnected: 'Đã mất kết nối lớp học' };
  return <section className="mx-auto max-w-xl space-y-5 p-8 text-center"><h1 className="text-2xl font-bold">{labels[state] || labels.ended}</h1><button type="button" onClick={onBack} className="rounded-xl bg-orange-600 px-5 py-3 font-bold text-white">Quay lại danh sách lớp</button></section>;
}
