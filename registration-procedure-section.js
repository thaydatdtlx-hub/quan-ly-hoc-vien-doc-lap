import "./registration-procedure-section.css";

function mountRegistrationProcedure(){
  if(document.querySelector(".registration-procedure-section"))return;
  const anchor=document.querySelector(".condition-section")||document.querySelector(".training-video-section")||document.querySelector(".registration-section");
  if(!anchor)return;

  const section=document.createElement("section");
  section.className="registration-procedure-section";
  section.id="thu-tuc-dang-ky";
  section.innerHTML=`
    <div class="registration-procedure-shell">
      <div class="registration-procedure-intro">
        <p>THỦ TỤC ĐĂNG KÝ HỌC BẰNG LÁI XE</p>
        <h2>Hồ sơ đơn giản, được hỗ trợ chuẩn bị</h2>
        <span>Học viên không cần chuẩn bị photo trước một số giấy tờ. Khi đến đăng ký sẽ được hướng dẫn và hỗ trợ hoàn thiện hồ sơ.</span>
        <div class="registration-procedure-help">
          <div><b>1</b><span><strong>Được hỗ trợ photo giấy tờ</strong><small>Không cần photo CMND/CCCD và bằng lái trước.</small></span></div>
          <div><b>2</b><span><strong>Chụp và rửa hình miễn phí</strong><small>Thực hiện khi học viên đến đăng ký.</small></span></div>
          <div><b>3</b><span><strong>Hướng dẫn giấy khám sức khỏe</strong><small>Được tư vấn nơi thực hiện và yêu cầu hồ sơ.</small></span></div>
        </div>
        <a href="#dang-ky">Đăng ký để được hướng dẫn</a>
      </div>

      <div class="registration-procedure-list">
        <article class="registration-procedure-item">
          <span>✓</span>
          <div>
            <h3>01 CMND/CCCD photo</h3>
            <p>Không cần công chứng. Học viên không cần photo trước vì sẽ được hỗ trợ khi đến đăng ký.</p>
            <em>Được hỗ trợ photo</em>
          </div>
        </article>

        <article class="registration-procedure-item">
          <span>✓</span>
          <div>
            <h3>12 hình 3×4 nền trắng</h3>
            <p>Khi chụp hình, mắt không đeo kính, tóc không che chân mày và không che tai. Học viên được chụp và rửa hình miễn phí khi đăng ký.</p>
            <em>Chụp hình miễn phí</em>
          </div>
        </article>

        <article class="registration-procedure-item">
          <span>✓</span>
          <div>
            <h3>Bản photo tất cả bằng lái xe hiện đang có</h3>
            <p>Học viên không cần photo trước. Trung tâm sẽ hỗ trợ photo các giấy phép lái xe hiện có để bổ sung hồ sơ.</p>
            <em>Được hỗ trợ photo</em>
          </div>
        </article>

        <article class="registration-procedure-item">
          <span>✓</span>
          <div>
            <h3>Giấy khám sức khỏe</h3>
            <p>Giấy khám sức khỏe dành cho người học lái xe theo yêu cầu hồ sơ. Học viên sẽ được hướng dẫn cụ thể khi đăng ký.</p>
            <em>Được hướng dẫn thực hiện</em>
          </div>
        </article>

        <div class="registration-procedure-note"><strong>Lưu ý:</strong> Học viên nên mang theo bản gốc CMND/CCCD và các bằng lái xe hiện có để đối chiếu và hỗ trợ photo tại nơi đăng ký.</div>
        <div class="registration-procedure-actions"><a href="#dang-ky">Đăng ký học lái xe</a><a href="https://zalo.me/0984811037" target="_blank" rel="noopener noreferrer">Hỏi thủ tục qua Zalo</a></div>
      </div>
    </div>`;

  anchor.insertAdjacentElement("afterend",section);
}

mountRegistrationProcedure();
