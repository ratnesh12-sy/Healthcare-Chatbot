package com.healthcare.aiassistant.repository;

import com.healthcare.aiassistant.model.ERole;
import com.healthcare.aiassistant.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Integer> {
    Optional<Role> findByName(ERole name);
}
