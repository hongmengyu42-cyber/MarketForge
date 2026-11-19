package com.marketforge.controller;

import com.marketforge.dto.response.ApiResponse;
import com.marketforge.entity.Category;
import com.marketforge.entity.Skill;
import com.marketforge.repository.CategoryRepository;
import com.marketforge.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class MetadataController {

    private final CategoryRepository categoryRepository;
    private final SkillRepository skillRepository;

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<Category>>> getCategories() {
        return ResponseEntity.ok(ApiResponse.success(categoryRepository.findAll()));
    }

    @GetMapping("/skills")
    public ResponseEntity<ApiResponse<List<Skill>>> getSkills() {
        return ResponseEntity.ok(ApiResponse.success(skillRepository.findAll()));
    }
}
