# GitHub Copilot Rules — Barber Queue Management

## Database Transactions

- Always create transactions in controllers, not in services.
- Use `this.prisma.$transaction(async (prisma) => { ... })`.
- Always name the transaction client `prisma` (never `tx`).
- Pass `prisma` to every service method that touches the database.

## Service Layer

```ts
async create(data: CreateUserDto, prisma: Prisma.TransactionClient)

Every service method must accept prisma as the last parameter.

Use Prisma.TransactionClient type for the prisma parameter.

Each service should only access its own model:

UserService → prisma.user.*

VisitService → prisma.visit.*

QueueService → prisma.queue.*

ServiceService → prisma.service.*

Do not mix domains.

If a service calls another service, pass the same prisma instance.

DTOs and Validation (Zod)

Use Zod for every request and response DTO.

Export both:

Schema → CreateVisitSchema

Type → CreateVisitDto

Validate all inputs before making any database calls.
```
