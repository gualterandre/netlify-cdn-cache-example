import { handle } from "hono/netlify";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { getStore } from "@netlify/blobs";
import { Config } from "@netlify/functions";

const getRandomNumber = () => Math.floor(Math.random() * 100);

const parseBooleanString = (val: string) => {
	const lowerCaseVal = val.toLowerCase();

	if (lowerCaseVal === "true" || lowerCaseVal === "1") return true;
	if (lowerCaseVal === "false" || lowerCaseVal === "0") return false;
	if (lowerCaseVal === "") return undefined;

	return val;
};

const parseBooleanNumber = (val: number) => {
	if (val === 1) return true;
	if (val === 0) return false;

	return val;
};

export const parseBoolean = (val: unknown) => {
	if (typeof val === "string") return parseBooleanString(val);

	if (typeof val === "number") return parseBooleanNumber(val);

	return val;
};

const app = new Hono();

app.use(logger());

app.post("/update-caching", async (c) => {
	const store = getStore({ name: "config", consistency: "strong" });
	const body = await c.req.json();

	const caching = parseBoolean(body.caching);

	if (typeof caching !== "boolean") {
		return c.json("Invalid caching value", 400);
	}

	await store.setJSON("use_caching", caching);

	return c.json({ message: "Successfully updated caching" });
});

app.get("/", async (c) => {
	const randomNumber = getRandomNumber();
	const store = getStore({ name: "config", consistency: "strong" });

	const cachingValue = await store.get("use_caching", { type: "json" });

	const caching = cachingValue ?? false;

	if (!caching) {
		c.header("Cache-Control", "public, max-age=0, no-cache");
		c.header(
			"Netlify-CDN-Cache-Control",
			"public, max-age=0, no-cache, durable",
		);
	}

	if (caching) {
		c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
		c.header(
			"Netlify-CDN-Cache-Control",
			"public, max-age=60, stale-while-revalidate=300, durable",
		);
	}

	console.log(`SSR - Random number [${randomNumber}]`);

	return c.html(`<h1>Testing Netlify cache [${randomNumber}]</h1>`);
});

export default handle(app);

export const config: Config = {
	path: ["/*"],
};
