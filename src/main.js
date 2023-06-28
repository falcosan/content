import "./index.css";
import App from "./App.vue";
import { createApp } from "vue";
import { router } from "@/router";
import initialize from "@/plugins/initialize";

const app = createApp(App);

app.use(router);
app.use(initialize);

app.mount("#app");
