export default function branding() : "sizhu" | "yuanjian" {
    return process.env.NEXT_PUBLIC_BRANDING === "sizhu" ? "sizhu" : "yuanjian";
}
