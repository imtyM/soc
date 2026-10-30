import { ConvexReactClient } from "convex/react";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexQueryClient } from "./convex-query-client";

// Protocol transport fixture only. No network, real session, JWT or auth bypass.
const sockets: SocketFixture[] = [];
class SocketFixture {
	onopen?: () => void;
	onclose?: (event: { code: number; reason: string }) => void;
	onerror?: () => void;
	readyState = 1;
	messages: { type: string }[] = [];
	constructor() {
		sockets.push(this);
	}
	send(value: string) {
		this.messages.push(JSON.parse(value));
	}
	close() {
		this.onclose?.({ code: 1000, reason: "" });
	}
}
afterEach(() => {
	vi.unstubAllGlobals();
	sockets.length = 0;
});

test("the app's real Convex client sends anonymous reads without an authentication wait", async () => {
	vi.stubGlobal("WebSocket", SocketFixture);
	const client = createConvexQueryClient(
		"https://fixture.convex.cloud",
	).convexClient;
	try {
		const unsubscribe = client
			.watchQuery(api.accounts.currentAccess, {})
			.onUpdate(() => {});
		const socket = sockets[0];
		if (!socket) throw Error("No transport was created");
		socket.onopen?.();
		expect(socket.messages.map((message) => message.type)).toContain(
			"ModifyQuerySet",
		);
		expect(socket.messages.map((message) => message.type)).not.toContain(
			"Authenticate",
		);
		unsubscribe();
	} finally {
		await client.close();
	}
});

test("negative control: an auth-only client's public read stays paused without a token", async () => {
	vi.stubGlobal("WebSocket", SocketFixture);
	const client = new ConvexReactClient("https://fixture.convex.cloud", {
		expectAuth: true,
	});
	try {
		const unsubscribe = client
			.watchQuery(api.accounts.currentAccess, {})
			.onUpdate(() => {});
		const socket = sockets[0];
		if (!socket) throw Error("No transport was created");
		socket.onopen?.();
		expect(socket.messages.map((message) => message.type)).not.toContain(
			"ModifyQuerySet",
		);
		unsubscribe();
	} finally {
		await client.close();
	}
});
