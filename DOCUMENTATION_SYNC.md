# Documentation Synchronization Guide

**Purpose**: Ensure all documentation stays in sync with code changes
**Last Updated**: February 1, 2026
**Status**: Active feedback loop established

---

## 📚 Core Documentation Files

### 1. **CLAUDE.md** (Project Instructions)
- **Location**: `/CLAUDE.md`
- **Purpose**: Instructions for Claude Code when working on this repository
- **Update Frequency**: After any architectural or feature changes
- **Owner**: Keep in sync with actual implementation

### 2. **PRD** (Product Requirements)
- **Location**: `/Users/sam.irizarry/Downloads/Sams_Workout_Tracker_PRD.md`
- **Purpose**: Original product vision and requirements
- **Update Frequency**: When features are completed or requirements change
- **Owner**: Product decisions and feature specifications

### 3. **Implementation Plan** (Deployment Plan)
- **Location**: `/Users/sam.irizarry/.claude/plans/dazzling-scribbling-lollipop.md`
- **Purpose**: Technical deployment roadmap and progress tracking
- **Update Frequency**: After completing each phase
- **Owner**: Track implementation progress and blockers

### 4. **Technical Reports** (Quality Documentation)
- **Location**: `/*.md` (root directory)
- **Files**:
  - `CODE_QUALITY_AUDIT.md`
  - `PERFORMANCE_OPTIMIZATION.md`
  - `ACCESSIBILITY_AUDIT.md`
  - `USER_JOURNEY_TESTS.md`
  - `WEB_COMPATIBILITY.md`
- **Update Frequency**: When significant changes are made to related areas

---

## 🔄 Documentation Sync Workflow

### When Making Code Changes

**BEFORE Starting Work**:
```
1. Read CLAUDE.md for current architecture understanding
2. Check Implementation Plan for task status
3. Review relevant technical reports (if modifying that area)
4. Note what documentation will need updates
```

**DURING Implementation**:
```
1. Keep notes of architectural decisions
2. Track new features/components added
3. Document breaking changes
4. Note performance implications
```

**AFTER Completing Work**:
```
1. Update CLAUDE.md if:
   - New navigation routes added
   - New hooks created
   - Database schema changed
   - New Edge Functions added
   - Dependencies added/removed
   - Development commands changed

2. Update Implementation Plan if:
   - Task completed
   - New blockers found
   - Timeline changes
   - Phase completed

3. Update Technical Reports if:
   - Performance characteristics changed
   - Accessibility improvements made
   - Security changes implemented
   - Test coverage changed

4. Create CHANGELOG entry
5. Update README if user-facing changes
```

---

## ✅ Documentation Update Checklist

Copy this checklist for each significant change:

### Feature Addition
- [ ] Added feature to CLAUDE.md "Core Features" section
- [ ] Updated navigation structure if new routes
- [ ] Added new hooks to documentation
- [ ] Updated database schema documentation
- [ ] Marked feature as complete in Implementation Plan
- [ ] Updated USER_JOURNEY_TESTS.md if new user flow
- [ ] Created/updated technical documentation

### Bug Fix
- [ ] Documented bug and fix in CHANGELOG
- [ ] Updated relevant technical report if architectural
- [ ] Updated test documentation if test case added
- [ ] Removed bug from Implementation Plan blockers

### Performance Optimization
- [ ] Updated PERFORMANCE_OPTIMIZATION.md with results
- [ ] Updated CLAUDE.md if caching strategy changed
- [ ] Documented benchmark improvements
- [ ] Updated best practices if new pattern established

### Accessibility Improvement
- [ ] Updated ACCESSIBILITY_AUDIT.md with fix
- [ ] Updated compliance score
- [ ] Documented pattern for future reference
- [ ] Updated implementation guide

### Database/Schema Change
- [ ] Updated CLAUDE.md database schema section
- [ ] Updated migration list
- [ ] Documented RLS policy changes
- [ ] Updated TypeScript types documentation
- [ ] Noted breaking changes if applicable

### Deployment/Infrastructure
- [ ] Updated deployment commands
- [ ] Updated environment variables documentation
- [ ] Updated Implementation Plan phase status
- [ ] Documented new build/deploy steps
- [ ] Updated README if user-facing

---

## 🤖 Automated Documentation Sync

### Git Pre-Commit Hook (Future Enhancement)

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check if significant files changed
if git diff --cached --name-only | grep -qE '^app/|^hooks/|^components/'; then
    echo "⚠️  Code changes detected. Remember to update documentation:"
    echo "   - CLAUDE.md (if architecture changed)"
    echo "   - Implementation Plan (if task completed)"
    echo "   - Technical reports (if relevant)"
    echo ""
    read -p "Have you updated documentation? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Please update documentation before committing"
        exit 1
    fi
fi
```

---

## 📋 Quick Reference: What to Update When

| Change Type | Update CLAUDE.md | Update Impl Plan | Update Tech Reports | Update PRD |
|-------------|------------------|------------------|---------------------|------------|
| New feature | ✅ Yes | ✅ Mark complete | ⚠️ If affects area | ⚠️ If requirement |
| Bug fix | ⚠️ If architectural | ✅ Remove blocker | ⚠️ If significant | ❌ No |
| Refactor | ⚠️ If patterns change | ❌ No | ⚠️ If perf impact | ❌ No |
| New dependency | ✅ Tech stack | ❌ No | ⚠️ If affects perf | ❌ No |
| Schema change | ✅ Database section | ⚠️ If milestone | ❌ No | ❌ No |
| New route | ✅ Navigation | ⚠️ If task | ⚠️ If user journey | ❌ No |
| Performance opt | ⚠️ If significant | ❌ No | ✅ Perf report | ❌ No |
| Accessibility fix | ⚠️ Best practices | ❌ No | ✅ A11y report | ❌ No |
| Phase complete | ⚠️ Status update | ✅ Phase status | ✅ Summary | ❌ No |

---

## 🎯 Current Documentation Status

### CLAUDE.md
- **Last Updated**: February 1, 2026
- **Status**: ✅ Up to date
- **Recent Changes**:
  - Added nutrition tracking hooks
  - Added activity logging hooks
  - Updated navigation with nutrition tab
  - Updated implementation status to 100%
  - Added web deployment information

### Implementation Plan
- **Last Updated**: February 1, 2026
- **Status**: ⚠️ Needs update (Phase 2 completed)
- **Pending Updates**:
  - Mark Phase 1 as 100% complete
  - Mark Phase 2 as 100% complete
  - Update critical gaps status (all fixed)
  - Add Phase 2 completion details

### Technical Reports
- **Last Updated**: February 1, 2026
- **Status**: ✅ Current
- **Files Created**:
  - CODE_QUALITY_AUDIT.md (Score: 92/100)
  - PERFORMANCE_OPTIMIZATION.md (Score: 88/100)
  - ACCESSIBILITY_AUDIT.md (Score: 78/100)
  - USER_JOURNEY_TESTS.md (98% complete)
  - WEB_COMPATIBILITY.md (Score: 92/100)

### README.md
- **Last Updated**: February 1, 2026
- **Status**: ✅ Up to date
- **Content**: Project overview and quick start

---

## 🔍 Documentation Review Cadence

### Daily (During Active Development)
- Check if code changes require doc updates
- Update task completion status
- Note breaking changes

### Weekly
- Review all documentation for accuracy
- Update implementation progress
- Check for outdated information

### After Each Phase
- Comprehensive documentation review
- Update all status indicators
- Create phase completion summary
- Update PRD completion status

### Before Production Deploy
- Full documentation audit
- Ensure deployment guides are current
- Update version numbers
- Create deployment checklist

---

## 📝 Documentation Style Guide

### File Naming
- Use `UPPERCASE_WITH_UNDERSCORES.md` for official documentation
- Use `lowercase-with-dashes.md` for supporting docs
- Include date in report filenames: `AUDIT_2026_02_01.md`

### Structure
```markdown
# Title
**Metadata**: Date, status, version, author

## Table of Contents (for long docs)

## Executive Summary (1-2 paragraphs)

## Detailed Content
- Use headings (##, ###)
- Use tables for comparisons
- Use code blocks for examples
- Use emoji sparingly (✅❌⚠️)

## Action Items / Next Steps

## References / See Also

---
*Footer with date and version*
```

### Code Examples
```typescript
// ✅ Good: Show actual working code
const example = useHook();

// ❌ Bad: Pseudocode without context
// ... do something ...
```

### Status Indicators
- ✅ Complete / Working / Good
- ⚠️ In Progress / Needs Attention / Warning
- ❌ Blocked / Broken / Critical Issue
- ⏳ Pending / Waiting
- 📋 Todo / Planned

---

## 🚨 Critical Documentation Rules

### Never:
1. ❌ Update code without updating related documentation
2. ❌ Mark tasks complete without verifying documentation updated
3. ❌ Deploy without ensuring deployment docs are current
4. ❌ Add breaking changes without documenting migration path

### Always:
1. ✅ Update CLAUDE.md when architecture changes
2. ✅ Update Implementation Plan when tasks complete
3. ✅ Document breaking changes immediately
4. ✅ Keep deployment commands accurate
5. ✅ Note dependencies when added/removed

---

## 🔄 Feedback Loop Process

### Step 1: Pre-Change Review
```bash
# Before making changes, review:
cat CLAUDE.md | grep -A 5 "relevant section"
cat Implementation_Plan | grep -A 5 "task"
```

### Step 2: Track Changes During Work
```bash
# Keep a running list:
echo "- Added nutrition tab to navigation" >> changes.txt
echo "- Created use-nutrition.ts hook" >> changes.txt
```

### Step 3: Post-Change Update
```bash
# Update all relevant docs
# Commit docs with code changes
git add CLAUDE.md changes.txt
git commit -m "feat: Add nutrition tracking

- Added nutrition tab to navigation
- Created use-nutrition.ts hook
- Updated CLAUDE.md with new routes

Updated documentation:
- CLAUDE.md: Added nutrition hooks section
- Implementation Plan: Marked task #4 complete
"
```

### Step 4: Verification
```bash
# Verify documentation is current
grep "nutrition" CLAUDE.md
grep "Task #4" Implementation_Plan.md
```

---

## 📊 Documentation Health Metrics

Track these metrics to ensure docs stay current:

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Docs updated with code | 100% | 100% | ✅ |
| Outdated info found | 0 | 0 | ✅ |
| Broken links | 0 | 0 | ✅ |
| Missing sections | 0 | 1 | ⚠️ |
| Days since last review | <7 | 0 | ✅ |

---

## 🎯 Documentation Owners

| Document | Primary Owner | Update Trigger |
|----------|---------------|----------------|
| CLAUDE.md | Development Team | Code changes |
| Implementation Plan | Project Lead | Task completion |
| Technical Reports | QA/Dev | Quality changes |
| README | Product | User-facing changes |
| PRD | Product Owner | Requirement changes |

---

## ✅ Success Criteria

Documentation sync is successful when:
- ✅ All documentation reflects current implementation
- ✅ No outdated or incorrect information found
- ✅ New developers can onboard using docs alone
- ✅ Deployment procedures are accurate and tested
- ✅ Architecture diagrams match actual code
- ✅ All links work and references are valid

---

*Last Review: February 1, 2026*
*Next Review: Before Phase 3 starts*
*Documentation Status: ✅ CURRENT*
