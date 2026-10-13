<img width="674" height="466" alt="image-3" src="https://github.com/user-attachments/assets/39dca036-e17a-4f4a-bfda-225c2921a44c" />
<img width="481" height="307" alt="image-2" src="https://github.com/user-attachments/assets/30de035b-61a5-49eb-b74e-e7be853ef422" />
# Gmail AI Reply Generator

A Chrome Manifest V3 extension that adds a **Generate reply** button beside the Send button in Gmail reply composers. Choose a tone to send the conversation to your Spring backend; its generated reply is inserted into the reply composer for you to review and edit before sending.

## Install

1. Start your Spring backend at `http://localhost:8080` and make sure `POST /api/email/generate` is available.
2. Open `chrome://extensions` in Chrome and enable **Developer mode**.
3. Select **Load unpacked** and choose this project folder.
4. Reload Gmail. Open or refresh a conversation and click **Reply**. The **Generate reply** button will appear next to **Send**.

## Use

Click **Generate reply**, choose Professional, Friendly, Concise, Formal, or Appreciative, and wait for the generated draft to appear in the reply editor. The extension posts JSON with `Request` (the email conversation) and `tone` (the selected tone) to `http://localhost:8080/api/email/generate`. The backend may return plain text or a JSON object with a `reply`, `generatedReply`, `response`, `result`, or `text` string field. Review and edit the result before sending.

The extension calls the local backend through its service worker so the request is not blocked by Gmail's page-origin CORS policy. The conversation is sent only when you choose a tone and generate a reply.

## Fixing Spring's "Invalid CORS request"

The extension has permission to call `http://localhost:8080`, but the Spring backend must also allow the extension's origin. Find the extension ID at `chrome://extensions` (under the extension's name), then allow the exact origin `chrome-extension://YOUR_EXTENSION_ID` for `POST` and `OPTIONS` on `/api/email/**`, with the `Content-Type` request header.

For a Spring MVC application, configure CORS, replacing `YOUR_EXTENSION_ID` with the ID shown in Chrome:

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/email/**")
                .allowedOrigins("chrome-extension://YOUR_EXTENSION_ID")
                .allowedMethods("POST", "OPTIONS")
                .allowedHeaders("Content-Type");
    }
}
```

If Spring Security is enabled, also enable CORS in the security filter chain with `http.cors(Customizer.withDefaults())` and register the same origin, methods, headers, and path in a `CorsConfigurationSource` bean. Restart the backend after changing its CORS configuration, then reload the extension and Gmail. Avoid allowing every origin as a workaround.
