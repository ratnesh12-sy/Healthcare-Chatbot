package com.healthcare.aiassistant.repository;

import com.healthcare.aiassistant.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByUsernameIgnoreCase(String username);
    Boolean existsByUsername(String username);
    Boolean existsByUsernameIgnoreCase(String username);
    Optional<User> findByEmail(String email);
    Boolean existsByEmail(String email);
}
