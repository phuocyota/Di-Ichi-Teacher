import { useEffect, useRef } from 'react';
import { X, PenLine } from 'lucide-react';

export function ClassroomWhiteboard({ open, onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const node = dialog.current;
    if (open && !node.open) node.showModal();
    else if (!open && node.open) node.close();
  }, [open]);
  return (
    <dialog
      id="live-whiteboard"
      ref={dialog}
      className="live-whiteboard-dialog"
      aria-labelledby="live-whiteboard-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <header className="live-whiteboard-header">
        <div>
          <h2 id="live-whiteboard-title">
            <PenLine size={20} aria-hidden="true" /> Bảng trắng
          </h2>
          <p>Đóng bảng để quay lại nội dung đang trình chiếu.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bảng trắng"
          autoFocus
        >
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      <div className="live-board-workspace">{children}</div>
    </dialog>
  );
}
