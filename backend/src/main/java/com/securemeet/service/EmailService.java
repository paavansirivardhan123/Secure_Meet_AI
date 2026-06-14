package com.securemeet.service;

import com.securemeet.entity.InviteToken;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${spring.mail.username:noreply@securemeet.com}")
    private String fromEmail;

    public void sendInviteEmail(InviteToken invite) {
        try {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(invite.getEmail());
            helper.setSubject("You've been invited to SecureMeet");

            String registerUrl = frontendUrl + "/register?token=" + invite.getToken()
                    + "&email=" + invite.getEmail();

            String html = """
                    <!DOCTYPE html>
                    <html>
                    <body style="font-family: 'IBM Plex Sans', Arial, sans-serif; background:#0a0a0f; color:#e3e5e8; padding:40px;">
                      <div style="max-width:500px; margin:0 auto; background:#111118; border:1px solid #1e1e2e; border-radius:12px; padding:32px;">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:24px;">
                          <div style="width:32px; height:32px; background:#5865f2; border-radius:8px; display:flex; align-items:center; justify-content:center;">
                            <span style="color:white; font-size:16px;">🔒</span>
                          </div>
                          <span style="font-size:18px; font-weight:600;">SecureMeet</span>
                        </div>
                        <h2 style="color:#e3e5e8; font-size:20px; margin-bottom:8px;">You're invited</h2>
                        <p style="color:#b5bac1; font-size:14px; line-height:1.6; margin-bottom:24px;">
                          You've been invited to join SecureMeet — a private, encrypted video meeting platform.
                          This invite is valid for <strong style="color:#e3e5e8;">7 days</strong> and is linked to this email address.
                        </p>
                        <a href="%s"
                           style="display:block; background:#5865f2; color:white; text-decoration:none;
                                  text-align:center; padding:14px 24px; border-radius:8px; font-weight:500; font-size:14px;">
                          Accept Invitation
                        </a>
                        <p style="color:#4e5058; font-size:11px; margin-top:20px; font-family:monospace; word-break:break-all;">
                          Token: %s
                        </p>
                        <p style="color:#4e5058; font-size:12px; margin-top:16px;">
                          If you weren't expecting this, you can safely ignore this email.
                        </p>
                      </div>
                    </body>
                    </html>
                    """.formatted(registerUrl, invite.getToken());

            helper.setText(html, true);
            mailSender.send(message);
            log.info("Invite email sent to {}", invite.getEmail());
        } catch (Exception e) {
            log.error("Failed to send invite email to {}: {}", invite.getEmail(), e.getMessage());
        }
    }
}
