package com.healthcare.aiassistant.util;

import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.model.ERole;
import com.healthcare.aiassistant.repository.UserRepository;
import com.healthcare.aiassistant.repository.RoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class UserInspector implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Override
    public void run(String... args) throws Exception {
        // System initialization complete.
    }
}
