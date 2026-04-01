package com.healthcare.aiassistant.model;

import jakarta.persistence.*;

@Entity
@Table(name = "system_settings", uniqueConstraints = {
        @UniqueConstraint(columnNames = "setting_key")
})
public class SystemSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "setting_key", nullable = false, length = 100)
    private String settingKey;

    @Column(nullable = false, length = 500)
    private String settingValue;

    public SystemSetting() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSettingKey() { return settingKey; }
    public void setSettingKey(String settingKey) { this.settingKey = settingKey; }
    public String getSettingValue() { return settingValue; }
    public void setSettingValue(String settingValue) { this.settingValue = settingValue; }
}
