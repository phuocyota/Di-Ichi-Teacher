export const gradingDashboardData = {
  summaryCards: [
    { label: 'Tổng bài cần chấm', value: 42, change: '+8 bài mới', tone: 'orange' },
    { label: 'Đã chấm hôm nay', value: 18, change: '72% mục tiêu ngày', tone: 'emerald' },
    { label: 'Chưa chấm', value: 24, change: '12 bài ưu tiên', tone: 'amber' },
    { label: 'Quá hạn chấm', value: 5, change: 'Cần xử lý trước 18:00', tone: 'rose' },
    { label: 'Điểm trung bình', value: '7.8', change: '+0.4 so với tuần trước', tone: 'sky' },
  ],
  gradedByDay: [
    { day: 'T2', graded: 12 },
    { day: 'T3', graded: 16 },
    { day: 'T4', graded: 10 },
    { day: 'T5', graded: 22 },
    { day: 'T6', graded: 18 },
    { day: 'T7', graded: 9 },
    { day: 'CN', graded: 6 },
  ],
  priorityQueue: [
    { title: 'Writing Task 2 - Education', className: 'IELTS Foundation A', due: 'Hôm nay 17:00', count: 8 },
    { title: 'Kids Speaking Checkpoint', className: 'Kids Starter B', due: 'Quá hạn 1 ngày', count: 5 },
    { title: 'TOEIC Mini Quiz 05', className: 'TOEIC Compact C', due: 'Ngày mai', count: 11 },
  ],
}
