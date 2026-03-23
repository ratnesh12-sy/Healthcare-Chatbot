package com.healthcare.aiassistant.util;

import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class UserInspector implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("--- DB PASSWORDS INSPECTION ---");
        List<User> users = userRepository.findAll();
        users.forEach(u -> {
            System.out.println("USER: " + u.getUsername() + " | PASS: " + u.getPassword() + " | ROLE: " + (u.getRole() != null ? u.getRole().getName().name() : "NULL"));
        });
        System.out.println("-------------------------------");
    }
}
