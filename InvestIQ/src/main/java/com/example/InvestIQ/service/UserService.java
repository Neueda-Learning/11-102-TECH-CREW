package com.example.InvestIQ.service;

import com.example.InvestIQ.model.User;
import com.example.InvestIQ.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {
    
    private final UserRepository userRepository;
    UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    public Optional<User> createUser(User user) {
        return userRepository.save(user);
    }

    public Optional<User> getUserById(Long userId) {
        return userRepository.findById(userId);
    }

    public Optional<User> updateUser(Long userId, User user) {
        Optional<User> existingUser = userRepository.findById(userId);
        if (existingUser.isPresent()) {
            User currentUser = existingUser.get();
            User updatedUser = new User(
                    currentUser.id(),
                    user.username() != null ? user.username() : currentUser.username(),
                    user.email() != null ? user.email() : currentUser.email(),
                    user.password() != null ? user.password() : currentUser.password(),
                    currentUser.createdAt()
            );
            return userRepository.save(updatedUser);
        } else {
            return Optional.empty();
        }
    }

    public void deleteUser(Long userId) {
        userRepository.deleteById(userId);
    }
}

