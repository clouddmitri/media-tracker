import { Router } from "express";
import { loginSchema, registerSchema } from "../auth.js";
import * as userRepo from "../repositories/user.repository.js";
import * as authService from "../services/auth-service.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { clearRefreshCookie, setRefreshCookie, REFRESH_COOKIE } from "../lib/cookies.js";
import { requireAuth, requireUser } from "../middleware/require-auth.js";
import { protect } from "../middleware/arcjet.js";
import { ajAuth, ajRegister } from "../lib/arcjet.js";
import { InvalidTokenError, TokenReuseError } from "../services/auth-service.js";
import type { Request } from "express";

export const authRouter: Router = Router();

function sessionMetadata(req: Request) {
  return {
    userAgent: req.get("User-Agent") ?? null,
    ipAddress: req.ip ?? null,
  };
}

authRouter.post(
  "/register",
  protect(ajRegister as unknown as Parameters<typeof protect>[0], {
    onError: "allow",
  }),
  async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Bad Request",
        message: parsed.error.issues[0]?.message ?? "Invalid input",
        requestId: req.id,
      });
      return;
    }

    const { email, password, displayName } = parsed.data;

    if ((await userRepo.findByEmail(email)) !== null) {
      res.status(409).json({
        error: "Conflict",
        message: "An account with that email already exists",
        requestId: req.id,
      });
      return;
    }

    const user = await userRepo.create({
      email,
      passwordHash: await hashPassword(password),
      displayName,
    });

    const pair = await authService.issueTokenPair(user.id, sessionMetadata(req));
    setRefreshCookie(res, pair.refreshToken, pair.refreshExpiresAt);

    res.status(201).json({ user, accessToken: pair.accessToken });
  },
);

authRouter.post("/login", protect(ajAuth, { onError: "allow" }), async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Bad Request",
      message: "Invalid input",
      requestId: req.id,
    });
    return;
  }

  const { email, password } = parsed.data;
  const user = await userRepo.findByEmail(email);

  if (user === null || !(await verifyPassword(user.passwordHash, password))) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid email or password",
      requestId: req.id,
    });
    return;
  }

  const pair = await authService.issueTokenPair(user.id, sessionMetadata(req));
  setRefreshCookie(res, pair.refreshToken, pair.refreshExpiresAt);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    },
    accessToken: pair.accessToken,
  });
});

authRouter.post("/refresh", async (req, res) => {
  const cookies = req.cookies as Record<string, string | undefined>;
  const token = Object.getOwnPropertyDescriptor(cookies, REFRESH_COOKIE)?.value as
    string | undefined;

  if (typeof token !== "string" || token.length === 0) {
    res.status(401).json({
      error: "Unauthorized",
      message: "No refresh token",
      requestId: req.id,
    });
    return;
  }

  try {
    const pair = await authService.rotateTokens(token, sessionMetadata(req));
    setRefreshCookie(res, pair.refreshToken, pair.refreshExpiresAt);
    res.json({ accessToken: pair.accessToken });
  } catch (err) {
    clearRefreshCookie(res);

    if (err instanceof TokenReuseError) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Session invalidated for security reasons. Please log in again.",
        requestId: req.id,
      });
      return;
    }

    if (err instanceof InvalidTokenError) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Session expired. Please log in again.",
        requestId: req.id,
      });
      return;
    }

    throw err;
  }
});

authRouter.post("/logout", async (req, res) => {
  const cookies = req.cookies as Record<string, string | undefined>;
  const token = Object.getOwnPropertyDescriptor(cookies, REFRESH_COOKIE)?.value as
    string | undefined;

  if (typeof token === "string") {
    await authService.revokeSession(token);
  }

  clearRefreshCookie(res);
  res.status(204).end();
});

authRouter.post("/logout-all", requireAuth, async (req, res) => {
  const count = await authService.revokeAllSessions(requireUser(req).id);
  clearRefreshCookie(res);
  res.json({ sessionsRevoked: count });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await userRepo.findById(requireUser(req).id);

  if (user === null) {
    res.status(404).json({
      error: "Not Found",
      message: "User no longer exists",
      requestId: req.id,
    });
    return;
  }

  res.json({ user });
});
