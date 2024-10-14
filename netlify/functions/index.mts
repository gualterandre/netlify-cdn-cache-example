import { handle } from "hono/netlify";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { getStore } from "@netlify/blobs";
import { Config } from "@netlify/functions";

const getRandomNumber = () => Math.floor(Math.random() * 100);

const app = new Hono();

app.use(logger());

app.post("/update-caching", async (c) => {
	const store = getStore({ name: "config", consistency: "strong" });
	const { caching } = await c.req.json();

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

	const caching = cachingValue ?? true;

	c.header("Cache-Control", "public, max-age=0, must-revalidate");

	if (caching) {
		c.header(
			"Netlify-CDN-Cache-Control",
			"public, max-age=60, stale-while-revalidate=120, durable",
		);
	}

	console.log(`SSR - Random number [${randomNumber}]`);

	return c.html(`<h1>Testing Netlify cache [${randomNumber}]</h1>`);
});

export default handle(app);

export const config: Config = {
	path: ["/*"],
};
