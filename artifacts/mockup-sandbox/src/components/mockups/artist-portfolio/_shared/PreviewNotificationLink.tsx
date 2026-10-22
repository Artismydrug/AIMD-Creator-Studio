import { Bell } from "lucide-react";
import { SANDBOX_CREATOR_ID, sandboxPaths, useSandboxInquiries } from "./inquiryPreviewStore";

export function PreviewNotificationLink() {
  const { unreadCount, error } = useSandboxInquiries(SANDBOX_CREATOR_ID);
  return (
    <a
      href={sandboxPaths.notifications}
      aria-label={`Notifications, ${unreadCount} unread`}
      title={error || "Creator notifications · sandbox"}
      data-testid="sandbox-notification-link"
      style={{
        position: "relative", display: "inline-flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0, width: 36, height: 36,
        border: "1.5px solid #1a1721", borderRadius: 12, color: "#1a1721",
        background: "#f8d86a", textDecoration: "none", boxShadow: "2px 2px 0 #1a1721",
      }}
    >
      <Bell size={17} aria-hidden="true" />
      {unreadCount > 0 && (
        <span style={{
          position: "absolute", top: -7, right: -7, minWidth: 20, height: 20,
          padding: "0 4px", display: "grid", placeItems: "center", borderRadius: 20,
          background: "#b50053", color: "#fff", border: "1.5px solid #1a1721",
          font: "800 10px 'DM Sans', sans-serif",
        }}>{unreadCount > 99 ? "99+" : unreadCount}</span>
      )}
    </a>
  );
}
