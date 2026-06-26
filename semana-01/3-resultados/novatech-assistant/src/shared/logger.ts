import pino from "pino";

export const logger = pino({
	name: "novatech-assistant",
	level: "info",
	base: undefined,
});
