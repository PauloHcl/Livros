import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type Role = "user" | "editor" | "admin";

function createContext(role?: Role): TrpcContext {
  return {
    user: role
      ? {
          id: 17,
          openId: "portal-test-user",
          name: "Pessoa de teste",
          email: "test@example.com",
          loginMethod: "manus",
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("controle de acesso do portal", () => {
  it("impede um membro de iniciar uma transmissão", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(
      caller.lives.create({
        title: "Live de teste",
        streamerName: "Membro",
        platform: "youtube",
        streamUrl: "https://www.youtube.com/watch?v=test123",
        embedUrl: "",
        layoutGroup: "",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
  });

  it("impede visitantes de publicar avaliações", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.catalog.addReview({
        type: "game",
        id: 1,
        rating: 8.5,
        personName: "Visitante",
        timeSpent: 4,
        progress: 35,
        notes: "",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" } satisfies Partial<TRPCError>);
  });

  it("impede membros de abrir a gestão de usuários", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.admin.members()).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
  });

  it("valida os campos do catálogo antes de tentar gravar", async () => {
    const caller = appRouter.createCaller(createContext("editor"));
    await expect(
      caller.catalog.createGame({
        title: "",
        coverUrl: "",
        preferredPlatform: "pc",
        description: "",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" } satisfies Partial<TRPCError>);
  });
});
