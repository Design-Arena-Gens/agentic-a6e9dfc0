"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type UploadItem = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  createdAt: number;
};

type Activity = {
  id: string;
  timestamp: number;
  message: string;
};

type PlanState = {
  hook: string;
  storyline: string[];
  shots: string[];
  broll: string[];
  cta: string;
  voiceOver: string[];
};

type MetadataState = {
  title: string;
  description: string;
  keywords: string[];
  chapters: { label: string; timestamp: string }[];
  optimisationTips: string[];
};

type ChatMessage = { id: string; role: "user" | "assistant"; text: string; createdAt: number };

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes)) return "0 B";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, index);
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[index]}`;
};

export default function HomePage() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [metadata, setMetadata] = useState<MetadataState | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      text: "Ready to orchestrate your next drop. Upload footage or draft a prompt and we’ll ship it to YouTube in record time.",
      createdAt: Date.now()
    }
  ]);
  const uploadsRef = useRef<UploadItem[]>([]);

  useEffect(() => {
    uploadsRef.current = uploads;
  }, [uploads]);

  useEffect(() => {
    return () => {
      uploadsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, []);

  const timeline = useMemo(() => {
    const base = [
      {
        id: "ingest",
        label: "Ingest & sync media",
        description: "Drop hero clips, b-roll, audio stems. Agent will label and tag automatically.",
        done: uploads.length > 0
      },
      {
        id: "script",
        label: "Script & narrative framing",
        description: "Generate hook, storyline, VO draft with adaptive pacing.",
        done: Boolean(plan)
      },
      {
        id: "metadata",
        label: "Metadata intelligence",
        description: "Titles, descriptions, tags tuned for search intent and retention.",
        done: Boolean(metadata)
      },
      {
        id: "publish",
        label: "Publish to YouTube",
        description: "Package assets, schedule upload, cross-post teasers.",
        done: false
      }
    ];

    return base;
  }, [uploads.length, plan, metadata]);

  const onUploadChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    const next = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      createdAt: Date.now(),
      url: URL.createObjectURL(file)
    }));
    setUploads((prev) => [...prev, ...next]);
    logActivity(`Uploaded ${next.length === 1 ? next[0].name : `${next.length} clips`}.`);
    event.target.value = "";
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((item) => item.id !== id);
    });
    logActivity("Removed an asset from the workspace.");
  };

  const logActivity = (message: string) => {
    setActivities((prev) => [
      { id: crypto.randomUUID(), timestamp: Date.now(), message },
      ...prev
    ]);
  };

  const submitPlanning = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPlanning(true);
    try {
      const form = new FormData(event.currentTarget);
      const payload = {
        topic: String(form.get("topic") ?? ""),
        audience: String(form.get("audience") ?? ""),
        tone: String(form.get("tone") ?? ""),
        callToAction: String(form.get("cta") ?? ""),
        videoLength: String(form.get("length") ?? ""),
        format: String(form.get("format") ?? "")
      };

      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "planVideo", payload })
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error ?? "Unable to generate plan");
      }
      setPlan(data.plan);
      logActivity("Generated a narrative plan and VO script.");
      appendAssistantMessage("New plan generated. Ready when you are to craft metadata.");
    } catch (error) {
      appendAssistantMessage(
        `I hit an issue generating the plan: ${(error as Error).message}. Give it another shot.`
      );
    } finally {
      setIsPlanning(false);
    }
  };

  const submitMetadata = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!plan) return;
    setIsGeneratingMetadata(true);
    try {
      const form = new FormData(event.currentTarget);
      const payload = {
        plan: {
          topic: String(form.get("metadataTopic") ?? ""),
          audience: String(form.get("metadataAudience") ?? "")
        },
        mood: String(form.get("metadataMood") ?? ""),
        platformGoal: String(form.get("metadataGoal") ?? ""),
        planDetails: plan
      };

      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generateMetadata", payload })
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error ?? "Unable to generate metadata");
      }
      setMetadata(data.metadata);
      logActivity("Metadata package drafted and queued for review.");
      appendAssistantMessage("Metadata optimised. Ready for publish workflow.");
    } catch (error) {
      appendAssistantMessage(
        `Couldn't create metadata: ${(error as Error).message}. Tweak the inputs and try again.`
      );
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  const submitChat = async () => {
    if (!chatInput.trim()) return;
    const messageText = chatInput.trim();
    setChatInput("");
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: messageText,
      createdAt: Date.now()
    };
    setMessages((prev) => [...prev, userMessage]);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          payload: {
            message: messageText,
            context: {
              uploaded: uploads.length,
              hasPlan: Boolean(plan),
              hasMetadata: Boolean(metadata)
            }
          }
        })
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error ?? "Chat error");
      }
      appendAssistantMessage(data.reply);
    } catch (error) {
      appendAssistantMessage(
        `The chat endpoint hiccupped: ${(error as Error).message}. Try again in a moment.`
      );
    }
  };

  const appendAssistantMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant", text, createdAt: Date.now() }
    ]);
  };

  return (
    <main className="page-grid">
      <section className="primary-column">
        <article className="surface-card">
          <span className="section-eyebrow">Ingest</span>
          <h2 className="section-title">Asset Intake & Media Labelling</h2>
          <p className="section-description">
            Drop footage, audio stems or brand kits. Agent auto-tags clips, logs metadata and preps
            them for assembly.
          </p>
          <label className="dropzone">
            <input type="file" accept="video/*,audio/*" multiple onChange={onUploadChange} />
            <div className="pill">UPLOAD</div>
            <strong>Drop files or browse</strong>
            <span className="section-description">
              MP4, MOV, WEBM, WAV, MP3 up to 2GB each supported in workspace.
            </span>
            <span className="dropzone-button">Select from device</span>
          </label>
          {uploads.length > 0 && (
            <div className="file-list">
              {uploads.map((item) => (
                <div className="file-item" key={item.id}>
                  <div className="file-meta">
                    <div className="pill">{item.type.split("/")[0].toUpperCase()}</div>
                    <div>
                      <div className="file-name">{item.name}</div>
                      <div className="file-size">{formatBytes(item.size)}</div>
                    </div>
                  </div>
                  <button className="file-remove" onClick={() => removeUpload(item.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="surface-card">
          <span className="section-eyebrow">Narrative</span>
          <h2 className="section-title">Creative Brief & Script Pass</h2>
          <p className="section-description">
            Feed the agent with audience intel and goals. It returns a hook, storyline, shotlist and
            VO moments ready for edit.
          </p>
          <form className="form-grid two-cols" onSubmit={submitPlanning}>
            <div className="form-control">
              <label className="form-label" htmlFor="topic">
                Core Topic
              </label>
              <input className="form-input" id="topic" name="topic" placeholder="AI content workflow" required />
            </div>
            <div className="form-control">
              <label className="form-label" htmlFor="audience">
                Audience
              </label>
              <input className="form-input" id="audience" name="audience" placeholder="solo creators, agencies" required />
            </div>
            <div className="form-control">
              <label className="form-label" htmlFor="tone">
                Desired Tone
              </label>
              <input className="form-input" id="tone" name="tone" placeholder="high-energy, cinematic" required />
            </div>
            <div className="form-control">
              <label className="form-label" htmlFor="format">
                Format
              </label>
              <input className="form-input" id="format" name="format" placeholder="talking head + screen capture" required />
            </div>
            <div className="form-control">
              <label className="form-label" htmlFor="length">
                Target Length
              </label>
              <input className="form-input" id="length" name="length" placeholder="3 minutes" required />
            </div>
            <div className="form-control">
              <label className="form-label" htmlFor="cta">
                Call to Action
              </label>
              <input className="form-input" id="cta" name="cta" placeholder="Download the workflow template" required />
            </div>
            <div className="form-control" style={{ gridColumn: "1 / -1" }}>
              <button className="primary-button" type="submit" disabled={isPlanning}>
                {isPlanning ? "Synthesising..." : "Generate Script Pass"}
              </button>
            </div>
          </form>
          {plan && (
            <div className="agent-output">
              <h4>Hook</h4>
              <p>{plan.hook}</p>
              <h4>Storyline Beats</h4>
              <ul>
                {plan.storyline.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
              <h4>Shotlist</h4>
              <ul>
                {plan.shots.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
              <h4>Voice Over Moments</h4>
              <ul>
                {plan.voiceOver.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
              <h4>Call To Action</h4>
              <p>{plan.cta}</p>
            </div>
          )}
        </article>

        <article className="surface-card">
          <span className="section-eyebrow">Distribution</span>
          <h2 className="section-title">YouTube Metadata Intelligence</h2>
          <p className="section-description">
            Turn narrative into titles, descriptions, tags and end-screen prompts engineered for
            watch-time and CTR.
          </p>
          <form className="form-grid two-cols" onSubmit={submitMetadata}>
            <div className="form-control">
              <label className="form-label" htmlFor="metadataTopic">
                Topic for SEO
              </label>
              <input
                className="form-input"
                id="metadataTopic"
                name="metadataTopic"
                placeholder="AI automation for creators"
                defaultValue=""
                required
              />
            </div>
            <div className="form-control">
              <label className="form-label" htmlFor="metadataAudience">
                Audience Snapshot
              </label>
              <input
                className="form-input"
                id="metadataAudience"
                name="metadataAudience"
                placeholder="YouTube creators scaling workflows"
                required
              />
            </div>
            <div className="form-control">
              <label className="form-label" htmlFor="metadataMood">
                Mood / Voice
              </label>
              <input
                className="form-input"
                id="metadataMood"
                name="metadataMood"
                placeholder="Bold, tactical, motivating"
                required
              />
            </div>
            <div className="form-control">
              <label className="form-label" htmlFor="metadataGoal">
                Platform Goal
              </label>
              <input
                className="form-input"
                id="metadataGoal"
                name="metadataGoal"
                placeholder="drive subscribers, rank for tutorials"
                required
              />
            </div>
            <div className="form-control" style={{ gridColumn: "1 / -1" }}>
              <button className="primary-button" type="submit" disabled={!plan || isGeneratingMetadata}>
                {!plan ? "Generate script first" : isGeneratingMetadata ? "Optimising..." : "Generate Metadata"}
              </button>
            </div>
          </form>
          {metadata && (
            <div className="agent-output">
              <h4>Title</h4>
              <p>{metadata.title}</p>

              <h4>Description</h4>
              <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit", color: "var(--text-soft)" }}>
                {metadata.description}
              </pre>

              <h4>Keywords</h4>
              <div className="metadata-chip-row">
                {metadata.keywords.map((keyword) => (
                  <span className="metadata-chip" key={keyword}>
                    {keyword}
                  </span>
                ))}
              </div>

              <h4>Chapters</h4>
              <ul>
                {metadata.chapters.map((chapter) => (
                  <li key={chapter.timestamp}>
                    {chapter.timestamp} — {chapter.label}
                  </li>
                ))}
              </ul>

              <h4>Optimisation Tips</h4>
              <ul>
                {metadata.optimisationTips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </article>
      </section>

      <aside className="secondary-column">
        <article className="surface-card">
          <span className="section-eyebrow">Pipeline</span>
          <h2 className="section-title">Agent Timeline</h2>
          <p className="section-description">
            Track the production cycle. Steps tick automatically as the agent completes each stage.
          </p>
          <div className="agent-timeline">
            {timeline.map((item) => (
              <div key={item.id} className={`timeline-item ${item.done ? "done" : ""}`}>
                <div className="timeline-content">
                  <h3 className="timeline-title">{item.label}</h3>
                  <p className="timeline-meta">{item.description}</p>
                </div>
                <div className="timeline-actions">
                  <span className="pill">{item.done ? "Complete" : "Pending"}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card">
          <span className="section-eyebrow">Activity</span>
          <h2 className="section-title">Agent Feed</h2>
          <div className="activity-feed">
            {activities.length === 0 && (
              <div className="activity-item">
                <div className="activity-time">Just now</div>
                <div className="activity-text">No events yet. Upload assets or run a workflow.</div>
              </div>
            )}
            {activities.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-time">{timeAgo(activity.timestamp)}</div>
                <div className="activity-text">{activity.message}</div>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card">
          <span className="section-eyebrow">Agent</span>
          <h2 className="section-title">Realtime Copilot</h2>
          <div className="assistant-chat">
            {messages.map((message) => (
              <div key={message.id} className={`chat-bubble ${message.role}`}>
                {message.text}
              </div>
            ))}
          </div>
          <div className="chat-input-row">
            <input
              className="chat-input"
              placeholder="Ask the agent for revisions, exports, or reminders..."
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitChat();
                }
              }}
            />
            <button className="chat-send" onClick={submitChat}>
              Send
            </button>
          </div>
        </article>
      </aside>
    </main>
  );
}

const timeAgo = (timestamp: number) => {
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes <= 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} days ago`;
};
