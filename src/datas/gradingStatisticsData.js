export const gradingStatisticsData = {
  overview: [
    { label: 'Tổng số bài đã chấm', value: 186 },
    { label: 'Điểm trung bình', value: 7.8 },
    { label: 'Điểm cao nhất', value: 9.6 },
    { label: 'Điểm thấp nhất', value: 4.5 },
  ],
  scoreDistribution: [
    { range: '0-4', count: 4 },
    { range: '5-6', count: 28 },
    { range: '7-8', count: 96 },
    { range: '9-10', count: 58 },
  ],
  scoreByClass: [
    { className: 'IELTS A', score: 7.6 },
    { className: 'Kids B', score: 8.4 },
    { className: 'TOEIC C', score: 7.2 },
    { className: 'Com Plus', score: 8.1 },
  ],
  scoreByType: [
    { type: 'Homework', score: 8.2 },
    { type: 'Quiz', score: 7.7 },
    { type: 'Midterm', score: 7.4 },
    { type: 'Final', score: 8.0 },
    { type: 'Writing', score: 7.1 },
    { type: 'Speaking', score: 7.9 },
  ],
}
