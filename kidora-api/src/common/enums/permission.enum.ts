// Fine-grained permissions used by the RBAC policy layer.
export enum Permission {
  COURSE_CREATE = 'course:create',
  COURSE_UPDATE = 'course:update',
  LESSON_UPLOAD = 'lesson:upload',
  STUDENT_VIEW = 'student:view',
  GRADE_MANAGE = 'grade:manage',
  USER_MANAGE = 'user:manage',
  PAYMENT_MANAGE = 'payment:manage',
  CHILD_VIEW = 'child:view',
  SUBSCRIPTION_MANAGE = 'subscription:manage',
  LESSON_LEARN = 'lesson:learn',
  GAME_PLAY = 'game:play',
}
