# Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Application Layer                              │
│                    (EnrolmentSystem.ts)                              │
│  - Orchestrates student registration, course creation, enrolment    │
│  - Enforces 10 domain rules in atomic transactions                  │
│  - Returns domain-specific errors                                    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ IUnitOfWork (Dependency Injection)
                            │
┌───────────────────────────┴─────────────────────────────────────────┐
│                      Repository Layer                                │
│                    (IRepository.ts)                                  │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Student Repo    │  │   Course Repo    │  │  Enrolment Repo  │  │
│  │  Interface       │  │   Interface      │  │  Interface       │  │
│  │                  │  │                  │  │                  │  │
│  │ • findById()     │  │ • findById()     │  │ • findByStudent()│  │
│  │ • findByEmail()  │  │ • findAll()      │  │ • findByCourse() │  │
│  │ • save()         │  │ • save()         │  │ • save()         │  │
│  │ • exists()       │  │ • exists()       │  │ • exists()       │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                       │
│  Transaction Coordination: ITransaction, IUnitOfWork                │
│  • beginTransaction()                                                │
│  • commit()                                                          │
│  • rollback()                                                        │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ Can be implemented with:
                            │ - In-memory (InMemoryRepository.ts)
                            │ - Database (PostgreSQL, MongoDB)
                            │ - Cloud storage (Firebase, DynamoDB)
                            │
┌───────────────────────────┴─────────────────────────────────────────┐
│                    Persistence Layer                                 │
│               (Pluggable Implementation)                             │
│                                                                       │
│  Current: InMemoryRepository.ts                                      │
│  • InMemoryStudentRepository (email index for O(1) lookup)          │
│  • InMemoryCourseRepository (direct ID mapping)                     │
│  • InMemoryEnrolmentRepository (dual indexing)                      │
│  • InMemoryUnitOfWork (transaction coordination)                    │
└────────────────────────────────────────────────────────────────────┘
```

## Domain Model Hierarchy

```
DomainError (abstract base)
│
├── StudentNotFoundError
├── CourseNotFoundError
├── CourseFullError
├── AlreadyEnrolledError
├── PrerequisiteNotMetError
├── CoRequisiteNotMetError
├── TimetableClashError
├── EnrolmentWindowClosedError
├── StudentIneligibleError
├── DuplicateStudentError
├── DuplicateCourseError
├── ValidationError
└── WaitlistFullError
```

## Data Model Relationships

```
Student
├── ID: S[0-9]{6}
├── Email: [validated@format.com]
├── Programme: CS | MATH | PHYS | ...
├── Year: 1 | 2 | 3 | 4
├── AcademicStanding: good | probation | suspended
└── CompletedCourses: Set<CourseID>

    ↓ has many
    
Enrolment (First-Class Concept)
├── StudentID (FK)
├── CourseID (FK)
├── Status: active | waitlisted | dropped
├── EnrolledDate: Date
└── Grade: number (0-100, optional)

    ↓ references

Course
├── ID: [A-Z]{2,4}[0-9]{3,4}
├── Name: string
├── Capacity: number > 0
├── EnrolledCount: number
├── Waitlist: string[] (StudentIDs)
├── Prerequisites: Set<CourseID>
├── Corequisites: Set<CourseID>
├── TimeSlots: TimeSlot[]
├── EnrolmentWindows: Map<phase, EnrolmentWindow>
├── MinimumYear: 1 | 2 | 3 | 4
└── AllowedProgrammes: string[]

TimeSlot
├── Day: MON | TUE | WED | THU | FRI | SAT | SUN
├── StartTime: 0-2359 (HHMM format)
├── EndTime: 0-2359
└── Semester: 1 | 2

EnrolmentWindow
├── Phase: registration | add-drop | withdrawal
├── StartDate: Date
├── EndDate: Date
└── Semester: 1 | 2
```

## Validation Pipeline

```
Input: registerStudent(student)
  │
  ├─→ StudentIDValidator.validateStudentId(id)
  │    └─→ Format check: S + 6 digits
  │
  ├─→ Validators.validateNonEmpty(name, "name")
  │    └─→ Non-empty string check
  │
  ├─→ Validators.validateEmail(email)
  │    └─→ RFC-compliant email format
  │
  ├─→ Validators.validateNonEmpty(programme, "programme")
  │    └─→ Non-empty string check
  │
  ├─→ Validators.validatePositiveInteger(year, "year")
  │    └─→ Must be positive integer
  │
  ├─→ if (year < 1 || year > 4) throw ValidationError("year")
  │    └─→ Year in range 1-4
  │
  ├─→ StudentRepository.existsByEmail(email)
  │    └─→ Email uniqueness check
  │
  ├─→ StudentRepository.exists(id)
  │    └─→ ID uniqueness check
  │
  └─→ StudentRepository.save(student)
      └─→ Persist to repository
      
Output: Student registered or ValidationError/DuplicateStudentError
```

## Enrolment Validation Pipeline

```
Input: enrolStudent(studentId, courseId, referenceDate)
  │
  ├─→ 1. Load and Validate Entities
  │    ├─→ StudentRepository.findById(studentId)
  │    │    └─→ Throw StudentNotFoundError if not found
  │    └─→ CourseRepository.findById(courseId)
  │         └─→ Throw CourseNotFoundError if not found
  │
  ├─→ 2. Check Student Eligibility
  │    └─→ if (student.getAcademicStanding() === "suspended")
  │         └─→ Throw StudentIneligibleError
  │
  ├─→ 3. Check Enrolment Window
  │    ├─→ course.isEnrolmentWindowOpen("registration", referenceDate)
  │    ├─→ course.isEnrolmentWindowOpen("add-drop", referenceDate)
  │    └─→ if (!isRegistration && !isAddDrop)
  │         └─→ Throw EnrolmentWindowClosedError
  │
  ├─→ 4. Check Not Already Enrolled
  │    └─→ if (EnrolmentRepository.exists(studentId, courseId))
  │         └─→ Throw AlreadyEnrolledError
  │
  ├─→ 5. Check Prerequisites
  │    └─→ for each prerequisite in course.getPrerequisites()
  │         if (!student.hasCompletedCourse(prereq))
  │            └─→ Throw PrerequisiteNotMetError
  │
  ├─→ 6. Check Co-requisites
  │    └─→ for each coreq in course.getCorequisites()
  │         if (!student.hasCompletedCourse(coreq))
  │            └─→ Throw CoRequisiteNotMetError
  │
  ├─→ 7. Check Timetable Clashes
  │    ├─→ getStudentEnrolments(studentId)
  │    └─→ for each studentCourse in enrolments
  │         for each slot1 in course.getTimeSlots()
  │            for each slot2 in studentCourse.getTimeSlots()
  │               if (slot1.clashWith(slot2))
  │                  └─→ Throw TimetableClashError
  │
  ├─→ 8. Check Year Eligibility
  │    └─→ if (student.getYear() < course.getMinimumYear())
  │         └─→ Throw StudentIneligibleError
  │
  ├─→ 9. Check Programme Eligibility
  │    ├─→ allowedProgrammes = course.getAllowedProgrammes()
  │    └─→ if (allowedProgrammes.length > 0 && !allowedProgrammes.includes(student.getProgramme()))
  │         └─→ Throw StudentIneligibleError
  │
  ├─→ 10. ATOMIC: Enrol in Course
  │    ├─→ course.enrollStudent(studentId) returns boolean
  │    ├─→ if available: add to enrolled, return true
  │    ├─→ if no capacity but waitlist space: add to waitlist, return false
  │    └─→ if no capacity and no waitlist space: throw CourseFullError
  │
  ├─→ 11. Create Enrolment Record
  │    └─→ new Enrolment(studentId, courseId, enrolled ? "active" : "waitlisted")
  │
  ├─→ 12. Persist All Changes Atomically
  │    ├─→ EnrolmentRepository.save(enrolment)
  │    ├─→ CourseRepository.save(course)
  │    └─→ StudentRepository.save(student)
  │
  └─→ 13. Commit Transaction
       └─→ UnitOfWork.commit()

Output: 
  - true (directly enrolled)
  - false (on waitlist)
  - or DomainError (any validation failed, transaction rolled back)
```

## Transaction Flow

```
┌─────────────────────────┐
│  Begin Transaction      │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Validate All Preconditions     │
│  (Check all domain rules)       │
└────────────┬────────────────────┘
             │
             ├──────No: Any Validation Failed────┐
             │                                    │
             ▼                                    ▼
    ┌────────────────┐                ┌──────────────────────┐
    │  All Valid     │                │ Throw DomainError    │
    └────────┬───────┘                └────────────┬─────────┘
             │                                     │
             ▼                                     ▼
┌─────────────────────────┐             ┌──────────────────┐
│  Perform All Changes    │             │ Rollback         │
│  (Atomically in memory) │             │ Transaction      │
└────────────┬────────────┘             └──────────────────┘
             │                                     │
             ▼                                     │
┌─────────────────────────┐             ┌──────────────────┐
│  Call commit()          │             │ Return error to  │
│  on transaction         │             │ caller (no state │
└────────────┬────────────┘             │  changed)        │
             │                          └──────────────────┘
             ▼
┌─────────────────────────┐
│ Operation Successful    │
│ Return result           │
│ (boolean or error-free) │
└─────────────────────────┘
```

## Waitlist Promotion Flow

```
Student A                    Course (Cap=2)
  │                            ├─ [Student B]
  │                            ├─ [Student C]
  │                            └─ Waitlist: [Student A]
  │
  └──→ dropStudent()
       │
       ├─→ Mark enrolment as dropped
       │
       ├─→ Remove from course.enrolled
       │    Course now: [Student B], [Student C], []
       │
       ├─→ Check if waitlist has students
       │    Yes: [Student A]
       │
       ├─→ Promote first from waitlist
       │    Waitlist pop: Student A
       │    Add to enrolled: [Student B], [Student C], [Student A]
       │
       ├─→ Create new Enrolment record (status: active)
       │
       └─→ Persist atomically
            ├─ Update course
            ├─ Update enrolment repo
            └─ Commit transaction

Result: Student A automatically enrolled when promoted
```

## Index Strategy (In-Memory Implementation)

```
StudentRepository:
┌─────────────────────────────────────────┐
│ Primary Storage: Map<StudentID, Student>│
├─────────────────────────────────────────┤
│ ID: S123456 → Student{...}              │
│ ID: S654321 → Student{...}              │
│ ID: S789012 → Student{...}              │
└─────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ Email Index: Map<Email, StudentID>       │
├──────────────────────────────────────────┤
│ alice@test.com → S123456                 │
│ bob@test.com → S654321                   │
│ charlie@test.com → S789012               │
└──────────────────────────────────────────┘

Operation: findByEmail("alice@test.com")
  1. Look up in email index: O(1)
  2. Get StudentID: S123456
  3. Look up in primary storage: O(1)
  4. Return Student
  Total: O(1) instead of O(n)

---

EnrolmentRepository:
┌──────────────────────────────────────────┐
│ Primary Storage: Map<"StudentID:CourseID",│
│                       Enrolment>         │
├──────────────────────────────────────────┤
│ S123456:CS1010 → Enrolment{...}          │
│ S123456:CS2020 → Enrolment{...}          │
│ S654321:CS1010 → Enrolment{...}          │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ Student Index:                            │
│ Map<StudentID, Set<CourseID>>            │
├──────────────────────────────────────────┤
│ S123456 → {CS1010, CS2020}               │
│ S654321 → {CS1010}                       │
│ S789012 → {}                             │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ Course Index:                             │
│ Map<CourseID, Set<StudentID>>            │
├──────────────────────────────────────────┤
│ CS1010 → {S123456, S654321}              │
│ CS2020 → {S123456}                       │
└──────────────────────────────────────────┘

Operation: findByStudent(S123456)
  1. Look up in student index: O(1)
  2. Get Set<CourseID>: {CS1010, CS2020}
  3. For each courseId, look up in primary: O(k) where k = # courses
  4. Return all enrolments
  Total: O(k) instead of O(n) where n = total enrolments
```

## Testing Architecture

```
Test Suite: EnrolmentSystem.test.ts

├─ Validation Tests (6 tests)
│  ├─ Student ID format
│  ├─ Email format
│  ├─ Course ID format
│  └─ Invalid input handling
│
├─ Basic Functionality (5 tests)
│  ├─ Student registration
│  ├─ Duplicate prevention
│  ├─ Course creation
│  └─ Retrieval operations
│
├─ Domain Rules (11 tests)
│  ├─ Prerequisites enforcement
│  ├─ Co-requisites enforcement
│  ├─ Timetable clash detection
│  ├─ Enrolment window enforcement
│  ├─ Year eligibility
│  ├─ Programme restrictions
│  └─ Academic standing checks
│
├─ Capacity & Waitlist (2 tests)
│  ├─ Course capacity enforcement
│  └─ Waitlist auto-promotion
│
└─ Error Handling (3 tests)
   ├─ StudentNotFoundError
   ├─ CourseNotFoundError
   └─ AlreadyEnrolledError

Total: 40+ comprehensive test cases
Coverage: All domain rules, edge cases, failure scenarios
```
