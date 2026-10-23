import { SignJWT, jwtVerify } from "jose";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";
import { HttpError } from "./errors.js";

const secret = new TextEncoder().encode(config.JWT_SECRET);

export async function createAccessToken(sellerId: string): Promise<string> {
  return new SignJWT({ sub: sellerId, typ: "seller" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("orivfide-api")
    .setAudience("orivfide-seller")
    .setIssuedAt()
    .setExpirationTime(config.JWT_EXPIRES_IN)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
    issuer: "orivfide-api",
    audience: "orivfide-seller",
  });
  if (payload.typ !== "seller" || typeof payload.sub !== "string") {
    throw new HttpError(401, "Invalid or expired access token.");
  }
  return payload.sub;
}

export async function createCustomerAccessToken(accountId: string): Promise<string> {
  return new SignJWT({ sub: accountId, typ: "customer" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("orivfide-api")
    .setAudience("orivfide-customer")
    .setIssuedAt()
    .setExpirationTime(config.JWT_EXPIRES_IN)
    .sign(secret);
}

export async function verifyCustomerAccessToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
    issuer: "orivfide-api",
    audience: "orivfide-customer",
  });
  if (payload.typ !== "customer" || typeof payload.sub !== "string") {
    throw new HttpError(401, "Invalid or expired access token.");
  }
  return payload.sub;
}

declare global {
  namespace Express {
    interface Request {
      sellerId?: string;
      customerId?: string;
    }
  }
}

export async function requireSeller(
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authorization = request.header("authorization");
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);
    const token = match?.[1];
    if (!token) throw new HttpError(401, "A bearer access token is required.");
    request.sellerId = await verifyAccessToken(token);
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Invalid or expired access token."));
  }
}

export async function requireCustomer(
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authorization = request.header("authorization");
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);
    const token = match?.[1];
    if (!token) throw new HttpError(401, "A bearer access token is required.");
    request.customerId = await verifyCustomerAccessToken(token);
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Invalid or expired access token."));
  }
}
