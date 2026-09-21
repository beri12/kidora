// stores/courseWizard.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BasicInfo {
  title: string;
  description: string;
  categoryId: string;
  subCategoryId: string;
  topic: string;
  language: string;
  subtitleLanguage: string;
  levelId: string;
  duration: string;
}

export interface QuizAnswer {
  text: string;
}

export interface LectureQuiz {
  question: string;
  answers: string[];
  correctAnswer: number;
}

export interface Lecture {
  id: string;
  title: string;
  order: number;
  videoFileName?: string; // actual File objects never persist to localStorage, only the name/url
  videoUrl?: string;
  quiz?: LectureQuiz;
}

export interface Section {
  id: string;
  title: string;
  order: number;
  lectures: Lecture[];
}

export interface AdvanceInfo {
  thumbnailUrl?: string;
  trailerUrl?: string;
  description: string;
  learningPoints: string[];
  requirements: string[];
  tags: string[];
}

interface StepStatus {
  basicInfo: boolean;
  curriculum: boolean;
  advanceInfo: boolean;
}

interface CourseWizardState {
  courseId: string | null;
  basicInfo: BasicInfo | null;
  sections: Section[];
  advanceInfo: AdvanceInfo | null;
  stepStatus: StepStatus;

  setCourseId: (id: string) => void;
  setBasicInfo: (data: BasicInfo) => void;
  setSections: (sections: Section[]) => void;
  setAdvanceInfo: (data: AdvanceInfo) => void;
  markStepDone: (step: keyof StepStatus) => void;
  reset: () => void;
}

const initialState = {
  courseId: null,
  basicInfo: null,
  sections: [],
  advanceInfo: null,
  stepStatus: { basicInfo: false, curriculum: false, advanceInfo: false },
};

export const useCourseWizard = create<CourseWizardState>()(
  persist(
    (set) => ({
      ...initialState,

      setCourseId: (id) => set({ courseId: id }),
      setBasicInfo: (data) => set({ basicInfo: data }),
      setSections: (sections) => set({ sections }),
      setAdvanceInfo: (data) => set({ advanceInfo: data }),
      markStepDone: (step) =>
        set((s) => ({ stepStatus: { ...s.stepStatus, [step]: true } })),
      reset: () => set(initialState),
    }),
    {
      name: 'cl.course-wizard',
      // thumbnailUrl/trailerUrl used to hold multi-megabyte base64 data URLs
      // (from FileReader.readAsDataURL on the raw file), which blew past the
      // ~5-10MB localStorage quota and threw QuotaExceededError inside
      // setAdvanceInfo, breaking the publish flow before any request was
      // sent. They now hold short http(s) URLs returned by the upload
      // endpoints, so there is nothing left to strip and persisting them is
      // what lets a half-finished wizard survive a page reload with its
      // already-uploaded artwork intact.
      //
      // The guard below is kept for one migration case: a browser that still
      // has an old entry containing a data: URL. Rehydrating that would put
      // the oversized string straight back into state (and into the next
      // publish payload), so those legacy values are dropped on read.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<CourseWizardState>;
        const merged: CourseWizardState = { ...current, ...saved };
        if (merged.advanceInfo) {
          const { thumbnailUrl, trailerUrl } = merged.advanceInfo;
          merged.advanceInfo = {
            ...merged.advanceInfo,
            thumbnailUrl: thumbnailUrl?.startsWith('data:') ? undefined : thumbnailUrl,
            trailerUrl: trailerUrl?.startsWith('data:') ? undefined : trailerUrl,
          };
        }
        return merged;
      },
    },
  ),
);