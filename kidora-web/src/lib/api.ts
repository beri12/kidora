// src/lib/api.ts

export const API = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL,

  auth: "/auth",

  courses: "/courses",

  categories: "/categories",

  enrollments: "/enrollments",

  payments: "/payments",

  lessons: "/lessons",

  quizzes: "/quizzes",

  certificates: "/certificates",

  contact: "/contact",

  uploads: {
    image: "/media/upload/image",
    video: "/media/upload/video",
    file: "/media/upload/file",
    subtitle: "/media/upload/subtitle",
  },
};