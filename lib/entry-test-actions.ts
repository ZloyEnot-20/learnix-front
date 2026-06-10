import { entryTestApi, entryTestPublicApi } from "./api"
import type { EntryTestSubmission } from "./entry-test-storage"

export interface EntryTestActions {
  saveMc: (
    id: string,
    answers: Record<number, string>,
    completed: boolean,
  ) => Promise<EntryTestSubmission>
  saveReading: (
    id: string,
    answers: Record<number, number | boolean>,
    completed: boolean,
  ) => Promise<EntryTestSubmission>
  saveWritingDraft: (id: string, text: string) => Promise<EntryTestSubmission>
  submitWriting: (id: string, text: string) => Promise<EntryTestSubmission>
}

export function studentEntryTestActions(): EntryTestActions {
  return {
    saveMc: (id, answers, completed) => entryTestApi.saveMc(id, answers, completed),
    saveReading: (id, answers, completed) => entryTestApi.saveReading(id, answers, completed),
    saveWritingDraft: (id, text) => entryTestApi.saveWritingDraft(id, text),
    submitWriting: (id, text) => entryTestApi.submitWriting(id, text),
  }
}

export function phoneEntryTestActions(phone: string): EntryTestActions {
  return {
    saveMc: (id, answers, completed) => entryTestPublicApi.saveMc(id, phone, answers, completed),
    saveReading: (id, answers, completed) =>
      entryTestPublicApi.saveReading(id, phone, answers, completed),
    saveWritingDraft: (id, text) => entryTestPublicApi.saveWritingDraft(id, phone, text),
    submitWriting: (id, text) => entryTestPublicApi.submitWriting(id, phone, text),
  }
}
