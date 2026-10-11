import { AccountSettings } from "./account-settings";
import { accountRequest, accountStorage } from "./account-session";
import { useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  ArrowUpRight,
  Bell,
  CalendarClock,
  FileSpreadsheet,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Network,
  Search,
  Settings2,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Input } from "./components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./components/ui/dialog";
import { type Conversation } from "./dashboard-data";
import { WorkspaceAtmosphere } from "./workspace-atmosphere";
import { Workspace } from "./core-workspace";
import { emptyContext, type LiveContext } from "./live-data";
import icon from "./assets/wabuddy-icon.png";
import "./dashboard.css";
import "./workspace.css";
import { WhatsAppPage } from "./whatsapp";

const navigation = [
  { name: "Chat", icon: Sparkles },
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Agent team", icon: Network },
  { name: "Spreadsheet", icon: FileSpreadsheet },
  { name: "Smart inbox", icon: MessageCircle },
  { name: "Schedule", icon: CalendarClock },
  { name: "Knowledge", icon: BookOpen },
  { name: "WhatsApp", icon: MessageCircle },
];

function Brand() {
  return (
    <div className="db-brand">
      <img src={icon} alt="" />
      <span>
        WA
        <br />
        BUDDY
      </span>
    </div>
  );
}
function Avatar({ person }: { person: Conversation }) {
  return (
    <span className={`contact-avatar ${person.color}`}>{person.initials}</span>
  );
}
function Dashboard() {
  const [page, setPage] = useState("Chat");
  const [liveContext,setLiveContext]=useState<LiveContext>(emptyContext);
  useEffect(()=>{const listener=(e:Event)=>setLiveContext((e as CustomEvent<LiveContext>).detail);window.addEventListener('wabuddy-live-context',listener);return()=>window.removeEventListener('wabuddy-live-context',listener);},[]);
  const conversations:Conversation[]=liveContext.attention.map(a=>({name:a.customer||a.chat,initials:(a.customer||a.chat).slice(0,2),color:'sage',message:a.evidence?.quote||a.reason,topic:a.kind,status:a.status,time:'Synced message',order:'Source',amount:a.evidence?.message_id||'',detail:a.reason}));
  const [businessMode, setBusinessMode] = useState(() => {
    try {
      return (
        (localStorage.getItem(accountStorage("wabuddy-whatsapp-mode")) ||
          document.documentElement.dataset.accountMode) === "business"
      );
    } catch {
      return false;
    }
  });
  const toggleWhatsAppMode = () => {
    setBusinessMode((current) => {
      const next = !current;
      try {
        localStorage.setItem(
          accountStorage("wabuddy-whatsapp-mode"),
          next ? "business" : "standard",
        );
      } catch {
        /* Session-only preference. */
      }
      return next;
    });
    setPage("WhatsApp");
    setMobileNav(false);
  };
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [dialog, setDialog] = useState<string | null>(null);
  const [read, setRead] = useState(false);
  const [activities, setActivities] = useState<{title:string;detail:string;page:string;time?:string}[]>([]);
  useEffect(() => {
    const update = (event: Event) => setActivities((event as CustomEvent).detail);
    window.addEventListener('wabuddy-workspace-notifications', update);
    return () => window.removeEventListener('wabuddy-workspace-notifications', update);
  }, []);
  const [toast, setToast] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    const request = () => setDialog("logout");
    window.addEventListener("wabuddy-logout-request", request);
    return () => window.removeEventListener("wabuddy-logout-request", request);
  }, []);
  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await accountRequest("/api/whatsapp/logout", {});
      location.reload();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to log out.");
      setLoggingOut(false);
    }
  };
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width:700px)").matches,
  );
  useEffect(() => {
    const content = document.querySelector<HTMLElement>("#dashboard-content");
    content?.scrollTo({ top: 0 });
    content?.focus({ preventScroll: true });
  }, [page]);
  useEffect(() => {
    const media = matchMedia("(max-width:700px)");
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const go = (next: string) => {
    setPage(next);
    setMobileNav(false);
    setSearch("");
  };
  const matches = conversations.filter((c) =>
    `${c.name} ${c.message} ${c.topic}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const showConversation = (c: Conversation) => {
    setSearch("");
    setSelected(c);
  };
  return (
    <div
      className={`db-app ${page !== "WhatsApp" ? "workspace-modern" : ""}`}
    >
      {mobileNav && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        className={`db-sidebar ${mobileNav ? "is-open" : ""}`}
        inert={mobile && !mobileNav}
      >
        <div className="sidebar-brand-row">
          <Brand />
          <button
            className="mobile-close"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <div
              key={item.name}
              className={
                item.name === "WhatsApp" ? "whatsapp-nav-row" : undefined
              }
            >
              <button
                className={`nav-item ${page === item.name ? "active" : ""}`}
                aria-current={page === item.name ? "page" : undefined}
                onClick={() => go(item.name)}
              >
                <item.icon size={18} />
                <span>{item.name}</span>
              </button>
              {item.name === "WhatsApp" && (
                <button
                  className={`whatsapp-mode-toggle ${businessMode ? "is-business" : ""}`}
                  role="switch"
                  aria-checked={businessMode}
                  aria-label="WhatsApp Business mode"
                  title={`${businessMode ? "Business" : "Standard"} mode — click to switch`}
                  onClick={toggleWhatsAppMode}
                >
                  <span>{businessMode ? "B" : "S"}</span>
                </button>
              )}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom" style={{ display: "flex" }}>
          <button className="nav-item" onClick={() => setDialog("settings")}>
            <Settings2 size={18} />
            <span>Settings</span>
          </button>
          <button
            className="nav-item"
            style={{ width: "auto" }}
            aria-label="Log out of WhatsApp"
            title="Log out"
            onClick={() => setDialog("logout")}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="db-main">
        {page!=="WhatsApp"&&<WorkspaceAtmosphere/>}
        {page === "WhatsApp" ? (
          <button
            className="whatsapp-nav-toggle"
            aria-label="Open navigation"
            onClick={() => setMobileNav(true)}
          >
            <Menu size={18} />
          </button>
        ) : (
          <header className="db-topbar">
            <button
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              Workspace <ChevronRight size={13} />
              <strong>{page==='Reports'?'Files':page}</strong>
            </div>
            <div className="topbar-actions">
              <div className="search-wrap">
                <Search size={16} />
                <Input
                  aria-label="Search review queue"
                  placeholder="Search review queue…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <div className="search-results">
                    <p>Review queue</p>
                    {matches.length ? (
                      matches.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => showConversation(c)}
                        >
                          <Avatar person={c} />
                          <span>
                            <strong>{c.name}</strong>
                            <small>{c.topic}</small>
                          </span>
                          <ArrowUpRight size={14} />
                        </button>
                      ))
                    ) : (
                      <div className="search-empty">
                        No review items match “{search}”.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <span className="preview-pill">
                <i /> {liveContext.connection==='connected'?'Connected':'Not connected'}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="notification-button"
                    aria-label="Notifications"
                  >
                    <Bell size={18} />
                    {!read && activities.length > 0 && <i />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="notifications-menu">
                  <DropdownMenuLabel>
                    <span>Notifications</span>
                    <Badge variant="secondary">{read ? 0 : activities.length}</Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {activities.map((a) => (
                    <DropdownMenuItem
                      key={a.title}
                      onSelect={() => {
                        go(a.page);
                        setRead(true);
                      }}
                    >
                      <span className="notification-dot" />
                      <div>
                        <strong>{a.title}</strong>
                        <small>{a.detail}</small>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setRead(true)}>
                    <CheckCheck />
                    Mark all as read
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="top-avatar" aria-label="Profile menu">
                    <Users size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => setDialog("settings")}>
                    <Settings2 />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setDialog("help")}>
                    <CircleHelp />
                    Help
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setDialog("logout")}>
                    <LogOut />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
        )}
        <main
          className={`db-content ${page === "WhatsApp" ? "whatsapp-content" : ""}`}
          id="dashboard-content"
          tabIndex={-1}
        >
          {page === "WhatsApp" ? (
            <WhatsAppPage business={businessMode} />
          ) : (
            <Workspace page={page} go={go} />
          )}
        </main>
      </div>
      {toast && (
        <div role="status" className="db-toast">
          <Check size={16} />
          {toast}
        </div>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="db-dialog">
          <DialogHeader>
            <DialogTitle>Conversation details</DialogTitle>
            <DialogDescription>
              Synchronized conversation · review queue
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <div className="detail-person">
                <Avatar person={selected} />
                <div>
                  <h3>{selected.name}</h3>
                  <p>
                    {selected.topic} · {selected.time}
                  </p>
                </div>
                <Badge variant="secondary">{selected.status}</Badge>
              </div>
              <div className="chat-bubble">
                {selected.message}
                <small>{selected.time}</small>
              </div>
              <div className="buddy-summary">
                <Sparkles size={18} />
                <div>
                  <strong>Buddy’s summary</strong>
                  <p>{selected.detail}</p>
                </div>
              </div>
              <div className="detail-order">
                <span>{selected.order}</span>
                <strong>{selected.amount}</strong>
              </div>
              <p className="preview-explainer">
                Review this item in Smart inbox. Sending a message is a separate WhatsApp action.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!dialog}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent className="db-dialog">
          <DialogHeader>
            <DialogTitle>
              {
                (
                  {
                    settings: "Workspace settings",
                    help: "Help",
                    logout: "Log out of WhatsApp?",
                    activity: "Recent activity",
                    metrics: "Metric definitions",
                    knowledge: "Knowledge details",
                  } as Record<string, string>
                )[dialog ?? ""]
              }
            </DialogTitle>
            <DialogDescription>
              {dialog === "logout"
                ? "Unlink the active account from WABuddy. Other saved accounts stay logged in. You will need to scan a QR to link this account again."
                : dialog === "settings"
                  ? "Manage accounts, execution engines, and startup preferences."
                  : "Ask Buddy, review the request, then follow the live task in Agent team."}
            </DialogDescription>
          </DialogHeader>
          {dialog === "logout" ? (
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)}>
                Stay here
              </Button>
              <Button disabled={loggingOut} onClick={() => void logout()}>
                <LogOut size={16} />
                {loggingOut ? "Logging out…" : "Log out"}
              </Button>
            </DialogFooter>
          ) : dialog === "settings" ? (
            <AccountSettings />
          ) : dialog === "activity" ? (
            <div className="dialog-activity">
              {activities.map((a) => (
                <div key={a.title}>
                  <CheckCheck size={18} />
                  <span>
                    <strong>{a.title}</strong>
                    <p>{a.detail}</p>
                    <small>{a.time} · Workspace event</small>
                  </span>
                </div>
              ))}
            </div>
          ) : dialog === "metrics" ? (
            <div className="help-content">
              <p>
                <strong>Conversations</strong> counts synchronized messages
                in the selected period (UTC).
              </p>
              <p>
                <strong>Outgoing</strong> includes owner replies and is not an AI-handled metric.
              </p>
              <p>
                <strong>Confirmed orders</strong> excludes inquiries and draft
                orders. It does not indicate verified payment.
              </p>
              <p>
                <strong>Completed tasks</strong> counts recorded agent completions.
              </p>
            </div>
          ) : dialog === "knowledge" ? (
            <div className="help-content">
              <p>
                Business knowledge gives Buddy a reliable source for replies.
                This preview includes example menu and pickup details.
              </p>
              <p>
                New information will be reviewed before it is used in customer
                conversations.
              </p>
              <Badge variant="outline">Owner-approved memory</Badge>
            </div>
          ) : (
            <div className="help-content">
              <p>
                <strong>1. Get the big picture.</strong> Check conversations,
                message activity, and completed tasks on your dashboard.
              </p>
              <p>
                <strong>2. Add your human touch.</strong> Open Smart inbox to
                review questions Buddy has set aside.
              </p>
              <p>
                <strong>3. Make Buddy your own.</strong> Explore knowledge and
                schedules to manage saved answers and recurring tasks.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

let root: Root | undefined;
export function mountDashboard(element: HTMLElement) {
  root ??= createRoot(element);
  root.render(<Dashboard />);
}
