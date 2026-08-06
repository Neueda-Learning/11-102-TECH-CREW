package com.example.InvestIQ.service;

import com.example.InvestIQ.model.User;
import com.example.InvestIQ.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    private User existingUser;

    @BeforeEach
    void setUp() {
        existingUser = new User(
                1L,
                "john",
                "john@example.com",
                "password123",
                LocalDateTime.of(2026, 1, 1, 10, 0)
        );
    }

    @Test
    @DisplayName("createUser should return saved user")
    void createUser_returnsSavedUser() {
        User input = new User(null, "john", "john@example.com", "password123", null);
        when(userRepository.save(input)).thenReturn(Optional.of(existingUser));

        var result = userService.createUser(input);

        assertThat(result).isPresent();
        assertThat(result.get()).isEqualTo(existingUser);
        verify(userRepository).save(input);
    }

    @Test
    @DisplayName("getUserById should return user when found")
    void getUserById_found_returnsUser() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(existingUser));

        var result = userService.getUserById(1L);

        assertThat(result).isPresent().contains(existingUser);
        verify(userRepository).findById(1L);
    }

    @Test
    @DisplayName("getUserById should return empty when user not found")
    void getUserById_notFound_returnsEmpty() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        var result = userService.getUserById(99L);

        assertThat(result).isEmpty();
        verify(userRepository).findById(99L);
    }

    @Test
    @DisplayName("updateUser should update all provided fields and preserve id/createdAt")
    void updateUser_fullUpdate_mergesAndSaves() {
        User patch = new User(null, "johnny", "johnny@example.com", "newPassword", null);
        User saved = new User(1L, "johnny", "johnny@example.com", "newPassword", existingUser.createdAt());

        when(userRepository.findById(1L)).thenReturn(Optional.of(existingUser));
        when(userRepository.save(saved)).thenReturn(Optional.of(saved));

        var result = userService.updateUser(1L, patch);

        assertThat(result).isPresent();
        assertThat(result.get().id()).isEqualTo(1L);
        assertThat(result.get().createdAt()).isEqualTo(existingUser.createdAt());
        assertThat(result.get().username()).isEqualTo("johnny");
        assertThat(result.get().email()).isEqualTo("johnny@example.com");
        assertThat(result.get().password()).isEqualTo("newPassword");
        verify(userRepository).findById(1L);
        verify(userRepository).save(saved);
    }

    @Test
    @DisplayName("updateUser should preserve existing fields when patch contains nulls")
    void updateUser_partialUpdate_preservesExistingFields() {
        User patch = new User(null, null, "updated@example.com", null, null);
        User merged = new User(1L, "john", "updated@example.com", "password123", existingUser.createdAt());

        when(userRepository.findById(1L)).thenReturn(Optional.of(existingUser));
        when(userRepository.save(merged)).thenReturn(Optional.of(merged));

        var result = userService.updateUser(1L, patch);

        assertThat(result).isPresent();
        assertThat(result.get().username()).isEqualTo("john");
        assertThat(result.get().email()).isEqualTo("updated@example.com");
        assertThat(result.get().password()).isEqualTo("password123");
        assertThat(result.get().createdAt()).isEqualTo(existingUser.createdAt());
    }

    @Test
    @DisplayName("updateUser should return empty when user does not exist")
    void updateUser_userNotFound_returnsEmpty() {
        User patch = new User(null, "johnny", "johnny@example.com", "newPassword", null);
        when(userRepository.findById(404L)).thenReturn(Optional.empty());

        var result = userService.updateUser(404L, patch);

        assertThat(result).isEmpty();
        verify(userRepository).findById(404L);
        verify(userRepository, never()).save(org.mockito.ArgumentMatchers.any(User.class));
    }

    @Test
    @DisplayName("deleteUser should delegate to repository")
    void deleteUser_callsRepository() {
        userService.deleteUser(1L);

        verify(userRepository).deleteById(1L);
    }
}
