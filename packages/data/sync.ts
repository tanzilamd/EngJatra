import {
  Snapshot,
  LearnerState,
  type Progress,
  type SnapshotData,
} from "../contracts/api";
import { mergeProgress } from "../learning/engine";
import { ApiError, readSnapshot, writeSnapshot } from "./client";
export type SyncStatus =
  "loading" | "saved" | "pending" | "conflict" | "error" | "storage_error";
export class SyncEngine {
  snapshot: SnapshotData;
  pending: Progress | null = null;
  private active = false;
  private durable = true;
  private key: string | null = null;
  constructor(
    private namespace: string,
    private changed: (s: SnapshotData, status: SyncStatus) => void,
    private read = readSnapshot,
    private write = writeSnapshot,
  ) {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(namespace);
    } catch {
      this.durable = false;
    }
    this.snapshot = {
      revision: 0,
      state: {
        unit_id: "P0-01",
        step: 0,
        release: "3.0.0",
        completed: [],
        words: [],
        mistakes: [],
        attempts: [],
        onboarded: false,
        tour: false,
        hints: true,
        large_text: false,
        keep_history: false,
      },
    };
    if (raw)
      try {
        const parsed = JSON.parse(raw);
        this.snapshot = Snapshot.parse(parsed.snapshot);
        this.pending = parsed.pending
          ? LearnerState.parse(parsed.pending)
          : null;
        this.key = parsed.key;
      } catch {
        try {
          localStorage.removeItem(namespace);
        } catch {
          this.durable = false;
        }
      }
  }
  private retain() {
    try {
      localStorage.setItem(
        this.namespace,
        JSON.stringify({
          snapshot: this.snapshot,
          pending: this.pending,
          key: this.key,
        }),
      );
      this.durable = true;
    } catch {
      this.durable = false;
    }
  }
  async init() {
    try {
      this.snapshot = await this.read();
      this.retain();
      this.changed(
        { ...this.snapshot, state: this.pending ?? this.snapshot.state },
        this.pending ? "pending" : "saved",
      );
      if (this.pending) await this.flush();
    } catch {
      this.changed(
        { ...this.snapshot, state: this.pending ?? this.snapshot.state },
        "error",
      );
    }
  }
  async update(state: Progress) {
    this.pending = state;
    this.key = crypto.randomUUID();
    this.retain();
    this.changed(
      { ...this.snapshot, state },
      this.durable ? "pending" : "storage_error",
    );
    await this.flush();
  }
  async flush() {
    if (this.active || !this.pending) return;
    this.active = true;
    const state = this.pending;
    const key = this.key!;
    try {
      const next = await this.write(state, this.snapshot.revision, key);
      this.snapshot = next;
      if (this.pending === state) {
        this.pending = null;
        this.key = null;
      }
      this.retain();
      this.changed(
        { ...next, state: this.pending ?? next.state },
        this.pending ? "pending" : "saved",
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const server = Snapshot.parse(
          (e.detail as { snapshot: unknown }).snapshot,
        );
        this.snapshot = server;
        this.pending = mergeProgress(server.state, this.pending ?? state);
        this.key = crypto.randomUUID();
        this.retain();
        this.changed({ ...server, state: this.pending }, "conflict");
      } else
        this.changed(
          { ...this.snapshot, state: this.pending ?? state },
          this.durable ? "pending" : "storage_error",
        );
    } finally {
      this.active = false;
    }
    if (this.pending && this.pending !== state) await this.flush();
  }
}
