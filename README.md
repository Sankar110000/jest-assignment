# Salon Booking API — Jest Automation Test Suite

Automated test suite for the Salon Booking Backend API, built with **Jest** and **Supertest**.

## Prerequisites

- **Node.js**: v18 or later
- **npm**: v9 or later
- **MongoDB**: latest version


## Environment Setup
- **JWT_SECERT** (optional)
- **MONGO_URI**: mongodb://username:password@host:27017/salon-db

## Install Dependencies

```bash
npm install
```

## Run Tests

```bash
npm test
```

### Run a specific test file

```bash
npx jest tests/auth/register.test.ts
```
### Setup / Teardown

- **Global Teardown**: Stops the `MongoMemoryServer` after all suites finish
- **Per-Suite**: Each test file connects to the DB, clears all collections between tests (`afterEach`), and disconnects after all tests in the suite (`afterAll`)

### Assumptions

1. The Express app is imported from `app.ts` (without starting the server) so Supertest can bind to it directly
2. Self-registered users are always assigned the `customer` role
3. Slots are generated at 30-minute intervals within salon open/close times
4. Time slot conflicts are checked per-stylist — different stylists can be booked at the same time

## API Endpoints Tested

| Method | Endpoint                                    | Auth Required |
|--------|---------------------------------------------|---------------|
| POST   | `/api/register`                             | No            |
| POST   | `/api/login`                                | No            |
| GET    | `/api/salons/:salonId/available-slots`      | No            |
| POST   | `/api/bookings`                             | Yes           |
| POST   | `/api/bookings/:bookingId/cancel`           | Yes           |
