import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api/index.js";
import { useAuth } from "../../state/AuthContext.jsx";
import AdminSidebar from "../../components/AdminSidebar.jsx";
import "../../adminMessages.css";

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const formatShortDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
};

export default function AdminMessages() {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [thread, setThread] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const threadEndRef = useRef(null);

  const adminId = user?._id || user?.id || "";

  const buildConversations = (list) => {
    const map = new Map();
    list.forEach((msg) => {
      const sender = msg?.senderId;
      const receiver = msg?.receiverId;
      const other =
        sender?.role !== "ADMIN" ? sender : receiver?.role !== "ADMIN" ? receiver : null;
      if (!other?._id) return;
      const time = new Date(msg.createdAt || 0).getTime();
      const existing = map.get(other._id) || {
        user: other,
        lastTime: 0,
        lastMessage: "",
        lastRawTime: null,
        count: 0,
        unread: 0
      };
      if (!existing || time > existing.lastTime) {
        existing.lastTime = time;
        existing.lastMessage = msg.content || "";
        existing.lastRawTime = msg.createdAt;
      }
      const isUnread =
        receiver?._id === adminId &&
        sender?._id === other._id &&
        (!msg.readAt);
      existing.count += 1;
      if (isUnread) existing.unread += 1;
      map.set(other._id, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.lastTime - a.lastTime);
  };

  const selectConversation = async (student) => {
    setSelectedUser(student);
    if (!student?._id) return;
    try {
      await api.markConversationRead(token, student._id);
      setMessages((prev) =>
        prev.map((msg) => {
          if (
            msg?.senderId?._id === student._id &&
            msg?.receiverId?._id === adminId &&
            !msg.readAt
          ) {
            return { ...msg, readAt: new Date().toISOString() };
          }
          return msg;
        })
      );
      setConversations((prev) =>
        prev.map((c) => (c.user?._id === student._id ? { ...c, unread: 0 } : c))
      );
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    api
      .listMyMessages(token)
      .then((data) => {
        if (!alive) return;
        const list = Array.isArray(data) ? data : [];
        setMessages(list);
        const convos = buildConversations(list);
        setConversations(convos);
        if (!selectedUser && convos[0]) {
          selectConversation(convos[0].user);
        }
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.message || "Unable to load messages.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    if (!selectedUser?._id) return;
    let alive = true;
    setThreadLoading(true);
    api
      .listUserMessages(token, selectedUser._id)
      .then((data) => {
        if (!alive) return;
        const list = Array.isArray(data) ? data : [];
        const sorted = [...list].sort(
          (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
        );
        setThread(sorted);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.message || "Unable to load conversation.");
      })
      .finally(() => {
        if (!alive) return;
        setThreadLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token, selectedUser?._id]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread, threadLoading]);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((c) =>
      (c.user?.name || c.user?.email || "").toLowerCase().includes(term)
    );
  }, [conversations, search]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || !selectedUser?._id) return;
    setSending(true);
    setError("");
    try {
      await api.sendMessage(token, selectedUser._id, content);
      setInput("");
      const [newThread, newAll] = await Promise.all([
        api.listUserMessages(token, selectedUser._id),
        api.listMyMessages(token)
      ]);
      const sortedThread = Array.isArray(newThread)
        ? [...newThread].sort(
            (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
          )
        : [];
      setThread(sortedThread);
      const allList = Array.isArray(newAll) ? newAll : [];
      setMessages(allList);
      setConversations(buildConversations(allList));
    } catch (err) {
      setError(err?.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="adminPageWrap adminMessagesPage">
      <div className="adminShell adminMessagesShell">
        <AdminSidebar />
        <main className="adminMessagesMain">
          <div className="adminMessagesTopbar">
            <div className="adminMessagesBreadcrumbs">
              <span>Home</span>
              <span className="material-symbols-outlined">chevron_right</span>
              <strong>Messages</strong>
            </div>
            <div className="adminMessagesTopActions">
              <label className="adminMessagesSearch">
                <span className="material-symbols-outlined">search</span>
                <input
                  type="search"
                  placeholder="Search students, messages..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <button type="button" className="adminMessagesBell">
                <span className="material-symbols-outlined">notifications</span>
              </button>
            </div>
          </div>

          {error && <div className="callout error">{error}</div>}

          <div className="adminMessagesLayout">
            <aside className="adminMessagesList">
              <div className="adminMessagesListCard">
                <h3>Conversations</h3>
                <p>Manage student inquiries</p>
                {loading && <div className="adminMessagesEmpty">Loading conversations...</div>}
                {!loading && filteredConversations.length === 0 && (
                  <div className="adminMessagesEmpty">No conversations yet.</div>
                )}
                <div className="adminMessagesItems">
                  {filteredConversations.map((item) => {
                    const isActive = selectedUser?._id === item.user?._id;
                    return (
                      <button
                        type="button"
                        key={item.user?._id}
                        className={`adminMessagesItem ${isActive ? "is-active" : ""}`}
                        onClick={() => selectConversation(item.user)}
                      >
                        <span className="adminMessagesAvatar">
                          {(item.user?.name || "U").trim().charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <div className="adminMessagesName">{item.user?.name || "Student"}</div>
                          <div className="adminMessagesSnippet">
                            {item.lastMessage || "No message yet"}
                          </div>
                        </div>
                        <div className="adminMessagesMeta">
                          <span>{formatShortDate(item.lastRawTime)}</span>
                          {item.unread > 0 && (
                            <span className="adminMessagesCount">{item.unread}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            <section className="adminMessagesChat">
              <div className="adminMessagesChatCard">
                <div className="adminMessagesChatHeader">
                  <div className="adminMessagesChatUser">
                    <span className="adminMessagesAvatar is-large">
                      {(selectedUser?.name || "U").trim().charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <div className="adminMessagesName">
                        {selectedUser?.name || "Select a conversation"}
                      </div>
                      <div className="adminMessagesStatus">
                        Online · Student ID: {selectedUser?._id?.slice(-6) || "—"}
                      </div>
                    </div>
                  </div>
                  <div className="adminMessagesChatActions">
                    <button type="button" className="adminMessagesIcon">
                      <span className="material-symbols-outlined">call</span>
                    </button>
                    <button type="button" className="adminMessagesIcon">
                      <span className="material-symbols-outlined">videocam</span>
                    </button>
                    <button type="button" className="adminMessagesIcon">
                      <span className="material-symbols-outlined">info</span>
                    </button>
                  </div>
                </div>

                <div className="adminMessagesChatBody">
                  {threadLoading && <div className="adminMessagesEmpty">Loading chat...</div>}
                  {!threadLoading && thread.length === 0 && (
                    <div className="adminMessagesEmpty">No messages in this conversation.</div>
                  )}
                  {!threadLoading &&
                    thread.map((msg) => {
                      const isOutgoing =
                        (msg.senderId?.role === "ADMIN") ||
                        (adminId && msg.senderId?._id === adminId);
                      return (
                        <div
                          key={msg._id}
                          className={`adminMessagesBubble ${
                            isOutgoing ? "is-outgoing" : "is-incoming"
                          }`}
                        >
                          <div className="adminMessagesBubbleText">{msg.content}</div>
                          <span className="adminMessagesBubbleTime">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      );
                    })}
                  <div ref={threadEndRef} />
                </div>

                <div className="adminMessagesComposer">
                  <button type="button" className="adminMessagesIcon">
                    <span className="material-symbols-outlined">add_circle</span>
                  </button>
                  <button type="button" className="adminMessagesIcon">
                    <span className="material-symbols-outlined">attach_file</span>
                  </button>
                  <input
                    type="text"
                    placeholder="Type your message here..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={!selectedUser}
                  />
                  <button
                    type="button"
                    className="adminMessagesSend"
                    onClick={sendMessage}
                    disabled={sending || !selectedUser}
                  >
                    Send
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
