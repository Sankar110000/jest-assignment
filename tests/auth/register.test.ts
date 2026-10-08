/// <reference types="jest" />
import request from "supertest";
import app from "../../app";
import * as dbHandler from "../setup/dbHandler";
import User from "../../models/User";

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe("POST /api/register", () => {
  it("should register a new user successfully", async () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      password: "password123"
    };

    const res = await request(app)
      .post("/api/register")
      .send(payload)
      .set('Accept', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("message", "User registered successfully");

    // Verify user is saved in DB with customer role and hashed password
    const dbUser = await User.findOne({ email: payload.email });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.name).toBe(payload.name);
    expect(dbUser?.role).toBe("customer");
    expect(dbUser?.password).not.toBe(payload.password);
  });

  it("should return 400 when registering with an existing email", async () => {
    const payload = {
      name: "Existing User",
      email: "existing@example.com",
      password: "password123"
    };

    await request(app).post("/api/register").send(payload).set('Accept', 'application/json');

    const res = await request(app)
      .post("/api/register")
      .send(payload)
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Email already in use");
  });

  it("should return 500 when email is missing", async () => {
    const payload = {
      name: "No Email",
      password: "password123"
    };

    const res = await request(app)
      .post("/api/register")
      .send(payload)
      .set('Accept', 'application/json');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error", "Server error");
  });

  it("should return 500 when name is missing", async () => {
    const payload = {
      email: "noname@example.com",
      password: "password123"
    };

    const res = await request(app)
      .post("/api/register")
      .send(payload)
      .set('Accept', 'application/json');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error", "Server error");
  });

  it("should return 500 when password is missing", async () => {
    const payload = {
      name: "No Password",
      email: "nopass@example.com"
    };

    const res = await request(app)
      .post("/api/register")
      .send(payload)
      .set('Accept', 'application/json');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error", "Server error");
  });
});