package com.securemeet.controller;

import com.securemeet.entity.InviteToken;
import com.securemeet.service.AdminService;
import com.securemeet.service.MeetingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final MeetingService meetingService;

    @PostMapping("/invite")
    public ResponseEntity<InviteToken> createInvite(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(adminService.createInvite(body.get("email")));
    }

    @PostMapping("/invite/email")
    public ResponseEntity<InviteToken> createInviteAndEmail(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(adminService.createInviteAndEmail(body.get("email")));
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @PutMapping("/users/{userId}/deactivate")
    public ResponseEntity<Void> deactivateUser(@PathVariable Long userId) {
        adminService.deactivateUser(userId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/users/{userId}/activate")
    public ResponseEntity<Void> activateUser(@PathVariable Long userId) {
        adminService.activateUser(userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/reports")
    public ResponseEntity<?> getPendingReports() {
        return ResponseEntity.ok(meetingService.getPendingReports());
    }
}
