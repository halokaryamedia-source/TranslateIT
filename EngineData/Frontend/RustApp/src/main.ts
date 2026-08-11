import "./styles/app.css";
import { mount } from "svelte";
import App from "./App.svelte";

const target = document.querySelector<HTMLDivElement>("#app");
if (!target) throw new Error("TranslateIT app root was not found.");

mount(App, { target });
