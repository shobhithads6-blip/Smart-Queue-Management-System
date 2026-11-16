package com.qms.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Valid login returns user details and sets a JWT cookie")
    void validLoginReturnsUserDetailsAndJwtCookie() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "username": "admin",
                                  "password": "admin123"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("admin"))
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.displayName").value("Admin"))
                .andExpect(jsonPath("$.token").value(""))
                .andExpect(cookie().exists("jwt"))
                .andExpect(cookie().httpOnly("jwt", true));
    }
@Test
@DisplayName("Wrong password is rejected")
void wrongPasswordIsRejected() throws Exception {
    mockMvc.perform(post("/api/auth/login")
                    .contentType("application/json")
                    .content("""
                            {
                              "username": "admin",
                              "password": "wrong-password"
                            }
                            """))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error")
                    .value("Invalid username or password"));
}
@Test
@DisplayName("Unknown username is rejected")
void unknownUsernameIsRejected() throws Exception {
    mockMvc.perform(post("/api/auth/login")
                    .contentType("application/json")
                    .content("""
                            {
                              "username": "unknown-user",
                              "password": "admin123"
                            }
                            """))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error")
                    .value("Invalid username or password"));
}
@Test
@DisplayName("Blank username is rejected")
void blankUsernameIsRejected() throws Exception {
    mockMvc.perform(post("/api/auth/login")
                    .contentType("application/json")
                    .content("""
                            {
                              "username": "",
                              "password": "admin123"
                            }
                            """))
            .andExpect(status().isBadRequest());
}
@Test
@DisplayName("Blank password is rejected")
void blankPasswordIsRejected() throws Exception {
    mockMvc.perform(post("/api/auth/login")
                    .contentType("application/json")
                    .content("""
                            {
                              "username": "admin",
                              "password": ""
                            }
                            """))
            .andExpect(status().isBadRequest());
}
}