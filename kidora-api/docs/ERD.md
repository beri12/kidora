# Kidora — Database ERD (text)

```
User 1─* ChildProfile
User 1─1 Avatar
User 1─1 RewardWallet
User 1─* Inventory *─1 AvatarItem
User 1─* Transaction
User 1─* UserAchievement *─1 Achievement
User 1─* StudentMission *─1 Mission
User 1─* LearningPath          (unique: studentId+world)
User 1─* AIConversation
User 1─1 Subscription 1─* Payment
User *─1 School *─1 District
User 1─* Progress *─1 Lesson
User 1─* UserBadge *─1 Badge
User 1─* Certificate
User 1─* Notification
User 1─* RefreshToken / Session / LoginHistory

Subject 1─* Course 1─* Lesson 1─* Resource
Lesson 1─1 Quiz 1─* QuizQuestion
Course *─1 User (teacher)
```

## Enums
- **Role**: CHILD · PARENT · TEACHER · SCHOOL_ADMIN · DISTRICT_ADMIN · SUPER_ADMIN · ADMIN
- **World**: READING_FOREST · MATH_ISLAND · SCIENCE_PLANET · CODING_CITY · ART_VALLEY
- **Rarity**: common · rare · epic · legendary
- **TxnType**: EARN · SPEND · BONUS · PURCHASE
- **PlanKey**: free · family · school · district
- **PaymentProvider**: stripe · paypal   **PaymentStatus**: pending · succeeded · failed · refunded
- **LessonType**: VIDEO · INTERACTIVE · QUIZ · GAME
```
