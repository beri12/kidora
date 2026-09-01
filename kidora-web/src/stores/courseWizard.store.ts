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

// The index signature lets StepStatus be passed straight to WizardStepper,
// which takes Record<string, boolean>.
export interface StepStatus {
  basicInfo: boolean;
  curriculum: boolean;
  advanceInfo: boolean;
  [step: string]: boolean;
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
      // thumbnailUrl/trailerUrl can be multi-megabyte base64 data URLs
      // (from FileReader.readAsDataURL on the raw file). localStorage has
      // a hard quota (~5-10MB per origin), so persisting these blows past
      // it instantly and throws QuotaExceededError, which was breaking
      // setAdvanceInfo (and therefore the whole publish flow) before any
      // network request was ever sent. partialize controls what actually
      // gets written to localStorage on every set() call, separately from
      // the live in-memory state, so we strip just these two fields here.
      // The in-memory advanceInfo (used by publishCourse in this session)
      // still has the real values, only the persisted copy is trimmed.
      partialize: (state) => ({
        ...state,
        advanceInfo: state.advanceInfo
          ? { ...state.advanceInfo, thumbnailUrl: undefined, trailerUrl: undefined }
          : state.advanceInfo,
      }),
    },
  ),
);