import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	root: "apps/frontend",
	plugins: [react()],
	server: {
		proxy: {
			"/api/auth": "http://localhost:3001",
			"/api/admin": "http://localhost:3001",
			"/api/me": "http://localhost:3001",
			"/api": "http://localhost:3000"
		}
	}
});